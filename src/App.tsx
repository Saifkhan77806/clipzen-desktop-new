import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "../supabase";

import "./App.css";

type ClipboardChangedPayload = {
  text: string;
};

type PendingClipboard = {
  text: string;
};

function App() {

  const [clipboardText, setClipboardText] =
    useState<string | null>(null);

  const [pendingClipboard, setPendingClipboard] =
    useState<PendingClipboard | null>(null);

  const [keyStorageStatus, setKeyStorageStatus] =
    useState<string | null>(null);

  const [deviceId, setDeviceId] =
    useState<string | null>(null);

  const [testingKeys, setTestingKeys] =
    useState(false);

  const [loadingDeviceId, setLoadingDeviceId] =
    useState(false);

const getDevicePublicKeys = async () => {
  try {
    const keys =
      await invoke<{
        deviceId: string;
        identityPublicKey: string;
        keyAgreementPublicKey: string;
      }>("get_device_public_keys");

    console.log(
      "CLIPZEN: Device public keys:",
      keys,
    );

    alert(
      `Device ID:\n${keys.deviceId}\n\n` +
      `Ed25519 public key:\n${keys.identityPublicKey}\n\n` +
      `X25519 public key:\n${keys.keyAgreementPublicKey}`,
    );
  } catch (error) {
    console.error(
      "CLIPZEN: Failed to load public keys:",
      error,
    );

    alert(String(error));
  }
};

  /*
   * Listen for native clipboard changes.
   */
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupClipboardListener = async () => {
      unlisten = await listen<ClipboardChangedPayload>(
        "clipboard-changed",
        (event) => {
          console.log(
            "CLIPZEN: Clipboard changed:",
            event.payload.text,
          );

          setClipboardText(event.payload.text);

          setPendingClipboard({
            text: event.payload.text,
          });
        },
      );
    };

    setupClipboardListener();

    return () => {
      unlisten?.();
    };
  }, []);

  /*
   * Load existing pending clipboard.
   */
  useEffect(() => {
    const loadPendingClipboard = async () => {
      try {
        const pending =
          await invoke<PendingClipboard | null>(
            "get_pending_clipboard",
          );

        setPendingClipboard(pending);
      } catch (error) {
        console.error(
          "CLIPZEN: Failed to load pending clipboard:",
          error,
        );
      }
    };

    loadPendingClipboard();
  }, []);

  /*
   * Read current Windows clipboard.
   */
  const refreshClipboard = async () => {
    try {
      const current =
        await invoke<string | null>(
          "get_current_clipboard",
        );

      if (current !== null) {
        setClipboardText(current);
      }
    } catch (error) {
      console.error(
        "CLIPZEN: Failed to read clipboard:",
        error,
      );
    }
  };

  /*
   * Temporary test for secure device-key storage.
   *
   * IMPORTANT:
   * The result goes only into keyStorageStatus.
   * It does NOT touch clipboardText or pendingClipboard.
   */
  const testSecureKeyStorage = async () => {
    setTestingKeys(true);
    setKeyStorageStatus(null);

    try {
      const result =
        await invoke<string>(
          "test_device_key_storage",
        );

      console.log(result);

      setKeyStorageStatus(result);
    } catch (error) {
      console.error(
        "CLIPZEN: Secure key storage test failed:",
        error,
      );

      setKeyStorageStatus(
        `Secure key storage test failed: ${String(error)}`,
      );
    } finally {
      setTestingKeys(false);
    }
  };

  /*
   * Load or create the permanent device UUID.
   */
  const loadDeviceId = async () => {
    setLoadingDeviceId(true);

    try {
      const id =
        await invoke<string>(
          "get_device_id",
        );

      console.log(
        "CLIPZEN: Device ID:",
        id,
      );

      setDeviceId(id);
    } catch (error) {
      console.error(
        "CLIPZEN: Failed to load device ID:",
        error,
      );

      setDeviceId(
        `Failed to load device ID: ${String(error)}`,
      );
    } finally {
      setLoadingDeviceId(false);
    }
  };

  /*
   * Manual SEND.
   *
   * Backend/WebSocket integration will be connected
   * in the next stage.
   */
  const sendPendingClipboard = () => {
    if (!pendingClipboard) {
      return;
    }

    console.log(
      "CLIPZEN: Manual SEND requested:",
      pendingClipboard.text,
    );

    // Backend/WebSocket sending will be implemented later.
  };

  return (
    <main className="app">
      {/* Header */}
      <header className="header">
        <div>
          <h1>CLIPZEN</h1>

          <p>
            Copy Once. Everywhere.
          </p>
        </div>

        <div className="status">
          <span className="status-dot" />

          <span>
            Clipboard monitoring
          </span>
        </div>
      </header>

      <section className="content">

        {/* Current Clipboard */}
        <div className="card">
          <h2>Current Clipboard</h2>

          <div className="clipboard-preview">
            {clipboardText ? (
              <p>
                {clipboardText}
              </p>
            ) : (
              <p className="muted">
                Copy something to your clipboard.
              </p>
            )}
          </div>

          <button onClick={refreshClipboard}>
            Refresh Clipboard
          </button>
        </div>


        {/* Connected Devices */}
        <div className="card">
          <h2>Connected Devices</h2>

          <div className="empty-state">
            <p>
              No devices connected
            </p>

            <button>
              Pair a Device
            </button>
          </div>
        </div>


        {/* Device Security */}
        <div className="card">
          <h2>Device Security</h2>

          <div className="device-security">

            {/* Secure key storage */}
            <div className="security-section">
              <h3>
                Private Key Storage
              </h3>

              <p className="muted">
                Device private keys are stored
                securely on this Windows machine.
              </p>

              <button
                onClick={testSecureKeyStorage}
                disabled={testingKeys}
              >
                {testingKeys
                  ? "Testing..."
                  : "Test Secure Key Storage"}
              </button>

              {keyStorageStatus && (
                <p className="security-result">
                  {keyStorageStatus}
                </p>
              )}
            </div>


            {/* Device ID */}
            <div className="security-section">
              <h3>
                Device Identity
              </h3>

              <p className="muted">
                Permanent CLIPZEN device identifier.
              </p>

              <button
                onClick={loadDeviceId}
                disabled={loadingDeviceId}
              >
                {loadingDeviceId
                  ? "Loading..."
                  : "Get Device ID"}
              </button>

              {deviceId && (
                <div className="device-id">
                  <span>
                    {deviceId}
                  </span>
                </div>
              )}
            </div>

            <button onClick={getDevicePublicKeys}>
              Get Public Keys
            </button>
          </div>
        </div>


        {/* Pending Clipboard */}
        <div className="card">
          <h2>Pending Clipboard</h2>

          {pendingClipboard ? (
            <div className="pending-item">

              <div className="pending-content">
                <p>
                  {pendingClipboard.text}
                </p>
              </div>

              <button
                onClick={sendPendingClipboard}
              >
                SEND
              </button>

            </div>
          ) : (
            <div className="empty-state">
              <p>
                No pending clipboard items
              </p>
            </div>
          )}
        </div>


        {/* Recent Activity */}
        <div className="card">
          <h2>Recent Activity</h2>

          <div className="empty-state">
            <p>
              No recent activity
            </p>
          </div>
        </div>

      </section>
    </main>
  );
}

export default App;