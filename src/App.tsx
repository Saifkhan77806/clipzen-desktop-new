import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import "./App.css";

type ClipboardChangedPayload = {
  text: string;
};

function App() {
  const [clipboardText, setClipboardText] = useState<string | null>(null);

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
        },
      );
    };

    setupClipboardListener();

    return () => {
      unlisten?.();
    };
  }, []);

  const refreshClipboard = async () => {
    try {
      const current =
        await invoke<string | null>("get_current_clipboard");

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

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>CLIPZEN</h1>
          <p>Copy Once. Everywhere.</p>
        </div>

        <div className="status">
          <span className="status-dot" />
          <span>Clipboard monitoring</span>
        </div>
      </header>

      <section className="content">
        <div className="card">
          <h2>Current Clipboard</h2>

          <div className="clipboard-preview">
            {clipboardText ? (
              <p>{clipboardText}</p>
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

        <div className="card">
          <h2>Connected Devices</h2>

          <div className="empty-state">
            <p>No devices connected</p>
            <button>Pair a Device</button>
          </div>
        </div>

        <div className="card">
          <h2>Pending Clipboard</h2>

          <div className="empty-state">
            <p>No pending clipboard items</p>
          </div>
        </div>

        <div className="card">
          <h2>Recent Activity</h2>

          <div className="empty-state">
            <p>No recent activity</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;