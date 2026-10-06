mod crypto;
mod secure_storage;

use base64::{
    engine::general_purpose::STANDARD,
    Engine,
};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
use arboard::Clipboard;
use tungstenite:: {connect, Message};
use serde::Serialize;
use tauri::Emitter;
use tauri_winrt_notification::{
    Duration as ToastDuration,
    Toast,
};


#[derive(Debug, Clone, Serialize)]
struct PendingClipboard {
    text: String,
}


struct ClipboardState {
    pending: Mutex<Option<PendingClipboard>>,
    remote_clipboard: Mutex<Option<String>>,
}


#[derive(Debug, serde::Deserialize)]
struct ClipboardReceivedMessage {
    version: u8,
    #[serde(rename = "type")]
    message_type: String,
    #[serde(rename = "messageId")]
    message_id: String,
    #[serde(rename = "sourceDeviceId")]
    source_device_id: String,
    timestamp: String,
    payload: ClipboardPayload,
}

#[derive(Debug, serde::Deserialize)]
struct ClipboardPayload {
    text: String,
}


#[derive(Clone, Serialize)]
struct ClipboardChangedPayload {
    text: String,
}

#[tauri::command]
fn get_current_clipboard() -> Result<Option<String>, String> {
    let mut clipboard =
        Clipboard::new().map_err(|error| error.to_string())?;

    match clipboard.get_text() {
        Ok(text) => Ok(Some(text)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn get_pending_clipboard(
    state: tauri::State<'_, ClipboardState>,
) -> Option<PendingClipboard> {
    state
        .pending
        .lock()
        .ok()
        .and_then(|pending| pending.clone())
}

#[tauri::command]
fn get_device_public_keys()
    -> Result<
        serde_json::Value,
        String,
    >
{
    let device_id =
        secure_storage::load_or_create_device_id()?;

    let keys =
        secure_storage::load_or_create_device_keys()?;

    Ok(serde_json::json!({
        "deviceId": device_id,
        "identityPublicKey":
            STANDARD.encode(
                keys.identity_public_key
            ),
        "keyAgreementPublicKey":
            STANDARD.encode(
                keys.key_agreement_public_key
            ),
    }))
}

#[tauri::command]
fn test_device_key_storage() -> Result<String, String> {
    let keys =
        secure_storage::load_or_create_device_keys()?;

    let identity =
        secure_storage::load_identity_private_key()?;

    let agreement =
        secure_storage::load_key_agreement_private_key()?;

    if identity != keys.identity_private_key {
        return Err(
            "Ed25519 private key verification failed"
                .to_string(),
        );
    }

    if agreement != keys.key_agreement_private_key {
        return Err(
            "X25519 private key verification failed"
                .to_string(),
        );
    }

    Ok(
        "CLIPZEN: Persistent device key storage verified"
            .to_string(),
    )
}

#[tauri::command]
fn get_device_id() -> Result<String, String> {
    secure_storage::load_or_create_device_id()
}

fn show_clipboard_notification(
    app_handle: tauri::AppHandle,
    text: String,
) {
    let notification_text = if text.chars().count() > 300 {
        let shortened: String =
            text.chars().take(300).collect();

        format!("{}...", shortened)
    } else {
        text.clone()
    };

    let result = Toast::new(Toast::POWERSHELL_APP_ID)
        .title("CLIPZEN")
        .text1("Clipboard detected")
        .text2(&notification_text)
        .duration(ToastDuration::Long)
        .add_button("ACCEPT", "accept")
        .add_button("DECLINE", "decline")
        .on_activated(move |action| {
            match action.as_deref() {
                Some("accept") => {
                    println!(
                        "CLIPZEN: Clipboard ACCEPTED"
                    );

                    if let Err(error) = app_handle.emit(
                        "clipboard-approval",
                        serde_json::json!({
                            "action": "accept",
                            "text": text,
                        }),
                    ) {
                        eprintln!(
                            "CLIPZEN: Failed to emit accept event: {}",
                            error
                        );
                    }
                }

                Some("decline") => {
                    println!(
                        "CLIPZEN: Clipboard DECLINED"
                    );

                    if let Err(error) = app_handle.emit(
                        "clipboard-approval",
                        serde_json::json!({
                            "action": "decline",
                        }),
                    ) {
                        eprintln!(
                            "CLIPZEN: Failed to emit decline event: {}",
                            error
                        );
                    }
                }

                other => {
                        println!(
                            "CLIPZEN: Notification activated: {:?}",
                            other
                        );

                        if let Some(window) =
                            app_handle.get_webview_window("main")
                        {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                 }
            }

            Ok(())
        })
        .show();

    if let Err(error) = result {
        eprintln!(
            "CLIPZEN: Failed to show Windows notification: {}",
            error
        );
    }
}


fn handle_websocket_message(
    app_handle: &tauri::AppHandle,
    message: Message,
) {
    match message {
       Message::Text(text) => {
    println!(
        "CLIPZEN: WebSocket message received"
    );

    let value =
        match serde_json::from_str::<serde_json::Value>(
            &text,
        ) {
            Ok(value) => value,

            Err(error) => {
                eprintln!(
                    "CLIPZEN: Invalid WebSocket JSON: {}",
                    error
                );

                return;
            }
        };

    let message_type =
        value
            .get("type")
            .and_then(|value| value.as_str());

    match message_type {
        Some("connected") => {
            println!(
                "CLIPZEN: WebSocket connection confirmed"
            );
        }

        Some("clipboard.received") => {
            let parsed =
                serde_json::from_value::<
                    ClipboardReceivedMessage,
                >(value);

            let message =
                match parsed {
                    Ok(message) => message,

                    Err(error) => {
                        eprintln!(
                            "CLIPZEN: Invalid clipboard.received message: {}",
                            error
                        );

                        return;
                    }
                };

            println!(
                "CLIPZEN: Clipboard received from {}",
                message.source_device_id
            );

            apply_remote_clipboard(
                app_handle,
                message.payload.text,
            );
        }

        Some(other) => {
            println!(
                "CLIPZEN: Ignoring WebSocket message type: {}",
                other
            );
        }

        None => {
            println!(
                "CLIPZEN: WebSocket message has no type"
            );
        }
    }
}

        Message::Close(frame) => {
            println!(
                "CLIPZEN: WebSocket closed: {:?}",
                frame
            );
        }

        other => {
            println!(
                "CLIPZEN: Ignoring WebSocket message: {:?}",
                other
            );
        }
    }
}


fn apply_remote_clipboard(
    app_handle: &tauri::AppHandle,
    text: String,
) {
    let mut clipboard = match Clipboard::new() {
        Ok(clipboard) => clipboard,

        Err(error) => {
            eprintln!(
                "CLIPZEN: Failed to open clipboard: {}",
                error
            );

            return;
        }
    };

    if let Err(error) = clipboard.set_text(text.clone()) {
    eprintln!(
        "CLIPZEN: Failed to write remote clipboard: {}",
        error
    );
    return;
}

println!("CLIPZEN: Remote clipboard applied");

match clipboard.get_text() {
    Ok(current) => {
        println!(
            "CLIPZEN: Clipboard verification: {}",
            current
        );
    }

    Err(error) => {
        eprintln!(
            "CLIPZEN: Clipboard verification failed: {}",
            error
        );
    }
}

    if let Ok(mut remote_clipboard) =
        app_handle
            .state::<ClipboardState>()
            .remote_clipboard
            .lock()
    {
        *remote_clipboard = Some(text.clone());
    }

    if let Err(error) =
        app_handle.emit(
            "remote-clipboard-changed",
            ClipboardChangedPayload { text },
        )
    {
        eprintln!(
            "CLIPZEN: Failed to emit remote clipboard event: {}",
            error
        );
    }
}

fn start_websocket(
    app_handle: tauri::AppHandle,
    server_url: String,
    device_id: String,
) {
    thread::spawn(move || {
        let websocket_url =
            format!(
                "{}/v1/ws?deviceId={}",
                server_url,
                device_id
            );

        println!(
            "CLIPZEN: Connecting to {}",
            websocket_url
        );

        let connection =
            connect(&websocket_url);

        let (mut socket, response) =
            match connection {
                Ok(connection) => connection,

                Err(error) => {
                    eprintln!(
                        "CLIPZEN: WebSocket connection failed: {}",
                        error
                    );

                    return;
                }
            };

        println!(
            "CLIPZEN: WebSocket connected with status {}",
            response.status()
        );

        loop {
            match socket.read() {
                Ok(message) => {
                    handle_websocket_message(
                        &app_handle,
                        message,
                    );
                }

                Err(error) => {
                    eprintln!(
                        "CLIPZEN: WebSocket read error: {}",
                        error
                    );

                    break;
                }
            }
        }

        println!(
            "CLIPZEN: WebSocket receiver stopped"
        );
    });
}

fn start_clipboard_monitor(
    app_handle: tauri::AppHandle,
) {
    let running =
        Arc::new(AtomicBool::new(true));

    let monitor_running =
        Arc::clone(&running);

    thread::spawn(move || {
        let mut clipboard =
            match Clipboard::new() {
                Ok(clipboard) => clipboard,

                Err(error) => {
                    eprintln!(
                        "CLIPZEN: Failed to initialize clipboard: {}",
                        error
                    );

                    return;
                }
            };

        let mut last_text: Option<String> = None;

        while monitor_running.load(Ordering::Relaxed) {
            match clipboard.get_text() {
                Ok(text) => {
                    let changed = match &last_text {
                        Some(previous) => {
                            previous != &text
                        }

                        None => {
                            last_text =
                                Some(text.clone());

                            false
                        }
                    };

                    if changed {
                        println!(
                            "CLIPZEN: Clipboard changed"
                        );

                        let is_remote_clipboard =
                            app_handle
                                    .state::<ClipboardState>()
                                    .remote_clipboard
                                    .lock()
                                    .ok()
                                    .map(|remote| {
                                    remote.as_deref() == Some(text.as_str())
                                    })
                                    .unwrap_or(false);

                            if is_remote_clipboard {
                                println!(
                                    "CLIPZEN: Ignoring remote clipboard change"
                                );

                                if let Ok(mut remote_clipboard) =
                                    app_handle
                                        .state::<ClipboardState>()
                                        .remote_clipboard
                                        .lock()
                                {
                                    *remote_clipboard = None;
                                }

                                last_text = Some(text);

                                continue;
                            }

                        last_text =
                            Some(text.clone());

                        // Store the clipboard as PENDING.
                        if let Ok(mut pending) =
                            app_handle
                                .state::<ClipboardState>()
                                .pending
                                .lock()
                        {
                            *pending =
                                Some(PendingClipboard {
                                    text: text.clone(),
                                });
                        }

                        // Show Windows notification.
                        show_clipboard_notification(
                            app_handle.clone(),
                            text.clone(),
                        );

                        // Notify React UI.
                        let payload =
                            ClipboardChangedPayload {
                                text: text.clone(),
                            };

                        if let Err(error) =
                            app_handle.emit(
                                "clipboard-changed",
                                payload,
                            )
                        {
                            eprintln!(
                                "CLIPZEN: Failed to emit clipboard event: {}",
                                error
                            );
                        }
                    }
                }

                Err(_) => {
                    // Clipboard may temporarily be
                    // unavailable while another
                    // application is accessing it.
                }
            }

            thread::sleep(
                Duration::from_millis(250),
            );
        }
    });
}


fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItem::with_id(
        app,
        "open",
        "Open CLIPZEN",
        true,
        None::<&str>,
    )?;

    let quit_item = MenuItem::with_id(
        app,
        "quit",
        "Quit CLIPZEN",
        true,
        None::<&str>,
    )?;

    let menu = Menu::with_items(
        app,
        &[&open_item, &quit_item],
    )?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("CLIPZEN - Copy Once. Everywhere.")
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "open" => {
                    if let Some(window) =
                        app.get_webview_window("main")
                    {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }

                "quit" => {
                    println!("CLIPZEN: Quit requested");
                    app.exit(0);
                }

                _ => {}
            }
        })
        .build(app)?;

    println!("CLIPZEN: System tray initialized");

    Ok(())
}

#[cfg_attr(
    mobile,
    tauri::mobile_entry_point
)]
pub fn run() {
    tauri::Builder::default()
        .manage(ClipboardState {
    pending: Mutex::new(None),
    remote_clipboard: Mutex::new(None),
         })
        .plugin(
            tauri_plugin_notification::init(),
        )
        .setup(|app| {
            setup_tray(app)?;

            let app_handle = app.handle().clone();

            let device_id = secure_storage::load_or_create_device_id()
        .map_err(|error| format!("Failed to initialize device ID: {}", error))?;

            let device_keys =
                secure_storage::load_or_create_device_keys()
                    .map_err(|error| format!("Failed to initialize device keys: {}", error))?;

            println!("CLIPZEN: Device identity initialized");
            println!("CLIPZEN: Device ID: {}", device_id);
            println!(
                "CLIPZEN: Ed25519 public key: {}",
                STANDARD.encode(device_keys.identity_public_key)
            );
            println!(
                "CLIPZEN: X25519 public key: {}",
                STANDARD.encode(device_keys.key_agreement_public_key)
            );

            if let Some(window) = app.get_webview_window("main") {
                let window_app_handle = app_handle.clone();

                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();

                        if let Some(window) =
                            window_app_handle.get_webview_window("main")
                        {
                            let _ = window.hide();
                        }

                        println!("CLIPZEN: Window hidden to tray");
                    }
                });
            }

            start_clipboard_monitor(
                app_handle.clone(),
            );

            start_websocket(
                app_handle,
                "ws://172.16.1.139:8080".to_string(),
                device_id,
            );

            Ok(())
         })
        .invoke_handler(
            tauri::generate_handler![
                get_current_clipboard,
                get_pending_clipboard,
                test_device_key_storage,
                get_device_id,
                get_device_public_keys
            ],
        )
        .run(
            tauri::generate_context!(),
        )
        .expect(
            "error while running CLIPZEN",
        );
}