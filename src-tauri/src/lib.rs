use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};

use arboard::Clipboard;
use serde::Serialize;
use tauri:: Emitter;
use tauri_winrt_notification::{
Duration as ToastDuration, Toast
};

#[derive(Clone, Serialize)]
struct ClipboardChangedPayload {
    text: String,
}

#[tauri::command]
fn get_current_clipboard() -> Result<Option<String>, String> {
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;

    match clipboard.get_text() {
        Ok(text) => Ok(Some(text)),
        Err(_) => Ok(None),
    }
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

fn start_clipboard_monitor(app_handle: tauri::AppHandle) {
    let running = Arc::new(AtomicBool::new(true));
    let monitor_running = Arc::clone(&running);

    thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(clipboard) => clipboard,
            Err(error) => {
                eprintln!("CLIPZEN: Failed to initialize clipboard: {}", error);
                return;
            }
        };

        let mut last_text: Option<String> = None;

        while monitor_running.load(Ordering::Relaxed) {
            match clipboard.get_text() {
                Ok(text) => {
                    let changed = match &last_text {
                        Some(previous) => previous != &text,
                        None => {
                            last_text = Some(text.clone());
                            false
                        }
                    };

                    if changed {
                        println!("CLIPZEN: Clipboard changed");

                        last_text = Some(text.clone());

                        show_clipboard_notification(
    app_handle.clone(),
    text.clone(),
);

                        let payload = ClipboardChangedPayload {
                            text: text.clone(),
                        };

                        if let Err(error) =
                            app_handle.emit("clipboard-changed", payload)
                        {
                            eprintln!(
                                "CLIPZEN: Failed to emit clipboard event: {}",
                                error
                            );
                        }
                    }
                }

                Err(_) => {
                    // Clipboard may temporarily be unavailable
                    // while another application is accessing it.
                }
            }

            thread::sleep(Duration::from_millis(250));
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            start_clipboard_monitor(app_handle);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_current_clipboard])
        .run(tauri::generate_context!())
        .expect("error while running CLIPZEN");
}
