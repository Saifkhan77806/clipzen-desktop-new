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
  /*
   * =====================================================
   * ACCOUNT AUTHENTICATION
   * =====================================================
   */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [authenticated, setAuthenticated] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);

  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);

  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState<string | null>(null);

  /*
   * =====================================================
   * EXISTING CLIPBOARD / DEVICE STATE
   * =====================================================
   */

  const [clipboardText, setClipboardText] = useState<string | null>(null);

  const [pendingClipboard, setPendingClipboard] =
    useState<PendingClipboard | null>(null);

  const [keyStorageStatus, setKeyStorageStatus] = useState<string | null>(null);

  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [testingKeys, setTestingKeys] = useState(false);

  const [loadingDeviceId, setLoadingDeviceId] = useState(false);

  /*
   * =====================================================
   * LOAD SUPABASE SESSION
   * =====================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (session) {
          console.log("CLIPZEN: Existing Supabase session found");

          console.log(
            "CLIPZEN: Starting device initialization from existing session",
          );

          await registerDeviceAfterLogin(session.access_token);
        } else {
          console.log("CLIPZEN: No existing Supabase session");
        }

        setAuthenticated(!!session);
        setAuthEmail(session?.user.email ?? null);
        setAuthLoading(false);
      } catch (error) {
        console.error("CLIPZEN: Failed to load auth session:", error);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);

      setAuthEmail(session?.user.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * =====================================================
   * LOGIN
   * =====================================================
   */

  const signIn = async () => {
    setAuthError(null);
    setAuthMessage(null);

    if (!email.trim()) {
      setAuthError("Email is required.");
      return;
    }

    if (!password) {
      setAuthError("Password is required.");
      return;
    }

    setAuthSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error("Login succeeded but no session was returned.");
      }

      const deviceRegistered = await registerDeviceAfterLogin(
        data.session.access_token,
      );

      if (!deviceRegistered) {
        return;
      }

      setAuthenticated(!!data.session);

      setAuthEmail(data.user.email ?? null);

      setPassword("");

      setAuthMessage("Signed in successfully.");
    } catch (error) {
      console.error("CLIPZEN: Sign-in failed:", error);

      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthSubmitting(false);
    }
  };

  /*
   * =====================================================
   * REGISTER ACCOUNT
   * =====================================================
   */

  const registerAccount = async () => {
    setAuthError(null);
    setAuthMessage(null);

    if (!email.trim()) {
      setAuthError("Email is required.");
      return;
    }

    if (!password) {
      setAuthError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      /*
       * Depending on the Supabase email-confirmation
       * setting, a newly registered user may receive
       * a session immediately or may need to confirm
       * their email first.
       */

      if (data.session) {
        setAuthenticated(true);

        setAuthEmail(data.user?.email ?? null);

        setAuthMessage("Account created successfully.");
      } else {
        setAuthMessage(
          "Account created. Please check your email to confirm your account before signing in.",
        );

        setAuthMode("login");
      }

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("CLIPZEN: Account registration failed:", error);

      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuthSubmitting(false);
    }
  };

  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const signOut = async () => {
    setAuthError(null);
    setAuthMessage(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setAuthenticated(false);
      setAuthEmail(null);
      setPassword("");
      setConfirmPassword("");

      setAuthMessage("Signed out successfully.");
    } catch (error) {
      console.error("CLIPZEN: Sign-out failed:", error);

      setAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  const registerDeviceAfterLogin = async (accessToken: string) => {
    try {
      console.log("CLIPZEN: registerDeviceAfterLogin() started");

      const serverUrl = "http://172.16.1.139:8080";

      console.log("CLIPZEN: Registering device with backend");

      const registeredDeviceId = await invoke<string>(
        "register_device_with_backend",
        {
          accessToken,
          serverUrl,
        },
      );

      console.log("CLIPZEN: Device registered:", registeredDeviceId);

      setDeviceId(registeredDeviceId);

      console.log("CLIPZEN: Starting authenticated WebSocket");

      await invoke("start_authenticated_websocket", {
        accessToken,
        serverUrl,
      });

      console.log("CLIPZEN: Authenticated WebSocket startup requested");

      return true;
    } catch (error) {
      console.error("CLIPZEN: Device/WebSocket initialization failed:", error);

      setAuthError(`Device initialization failed: ${String(error)}`);

      return false;
    }
  };

  /*
   * =====================================================
   * DEVICE PUBLIC KEYS
   * =====================================================
   */

  const getDevicePublicKeys = async () => {
    try {
      const keys = await invoke<{
        deviceId: string;
        identityPublicKey: string;
        keyAgreementPublicKey: string;
      }>("get_device_public_keys");

      console.log("CLIPZEN: Device public keys:", keys);

      alert(
        `Device ID:\n${keys.deviceId}\n\n` +
          `Ed25519 public key:\n${keys.identityPublicKey}\n\n` +
          `X25519 public key:\n${keys.keyAgreementPublicKey}`,
      );
    } catch (error) {
      console.error("CLIPZEN: Failed to load public keys:", error);

      alert(String(error));
    }
  };

  /*
   * =====================================================
   * CLIPBOARD LISTENER
   * =====================================================
   */

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupClipboardListener = async () => {
      unlisten = await listen<ClipboardChangedPayload>(
        "clipboard-changed",
        (event) => {
          console.log("CLIPZEN: Clipboard changed:", event.payload.text);

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
   * =====================================================
   * LOAD EXISTING PENDING CLIPBOARD
   * =====================================================
   */

  useEffect(() => {
    const loadPendingClipboard = async () => {
      try {
        const pending = await invoke<PendingClipboard | null>(
          "get_pending_clipboard",
        );

        setPendingClipboard(pending);
      } catch (error) {
        console.error("CLIPZEN: Failed to load pending clipboard:", error);
      }
    };

    loadPendingClipboard();
  }, []);

  /*
   * =====================================================
   * READ CURRENT CLIPBOARD
   * =====================================================
   */

  const refreshClipboard = async () => {
    try {
      const current = await invoke<string | null>("get_current_clipboard");

      if (current !== null) {
        setClipboardText(current);
      }
    } catch (error) {
      console.error("CLIPZEN: Failed to read clipboard:", error);
    }
  };

  /*
   * =====================================================
   * SECURE KEY STORAGE TEST
   * =====================================================
   */

  const testSecureKeyStorage = async () => {
    setTestingKeys(true);
    setKeyStorageStatus(null);

    try {
      const result = await invoke<string>("test_device_key_storage");

      console.log(result);

      setKeyStorageStatus(result);
    } catch (error) {
      console.error("CLIPZEN: Secure key storage test failed:", error);

      setKeyStorageStatus(`Secure key storage test failed: ${String(error)}`);
    } finally {
      setTestingKeys(false);
    }
  };

  /*
   * =====================================================
   * DEVICE ID
   * =====================================================
   */

  const loadDeviceId = async () => {
    setLoadingDeviceId(true);

    try {
      const id = await invoke<string>("get_device_id");

      console.log("CLIPZEN: Device ID:", id);

      setDeviceId(id);
    } catch (error) {
      console.error("CLIPZEN: Failed to load device ID:", error);

      setDeviceId(`Failed to load device ID: ${String(error)}`);
    } finally {
      setLoadingDeviceId(false);
    }
  };

  /*
   * =====================================================
   * MANUAL SEND
   * =====================================================
   */

  const sendPendingClipboard = () => {
    if (!pendingClipboard) {
      return;
    }

    console.log("CLIPZEN: Manual SEND requested:", pendingClipboard.text);

    // Existing backend/WebSocket sending
    // functionality remains unchanged.
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <main className="app">
      {/* Header */}
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
        {/* Account */}
        <div className="card">
          <h2>Account</h2>

          {authLoading ? (
            <p className="muted">Checking account...</p>
          ) : authenticated ? (
            <>
              <p>
                Signed in as <strong>{authEmail}</strong>
              </p>

              {authMessage && <p className="security-result">{authMessage}</p>}

              <button onClick={signOut}>Sign Out</button>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "16px",
                }}
              >
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                    setAuthMessage(null);
                  }}
                  disabled={authMode === "login"}
                >
                  Login
                </button>

                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                    setAuthMessage(null);
                  }}
                  disabled={authMode === "register"}
                >
                  Register
                </button>
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={authSubmitting}
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={authSubmitting}
                />

                {authMode === "register" && (
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={authSubmitting}
                  />
                )}

                <button
                  onClick={authMode === "login" ? signIn : registerAccount}
                  disabled={authSubmitting}
                >
                  {authSubmitting
                    ? "Please wait..."
                    : authMode === "login"
                      ? "Login"
                      : "Create Account"}
                </button>

                {authError && <p className="security-result">{authError}</p>}

                {authMessage && (
                  <p className="security-result">{authMessage}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Current Clipboard */}
        <div className="card">
          <h2>Current Clipboard</h2>

          <div className="clipboard-preview">
            {clipboardText ? (
              <p>{clipboardText}</p>
            ) : (
              <p className="muted">Copy something to your clipboard.</p>
            )}
          </div>

          <button onClick={refreshClipboard}>Refresh Clipboard</button>
        </div>

        {/* Connected Devices */}
        <div className="card">
          <h2>Connected Devices</h2>

          <div className="empty-state">
            <p>No devices connected</p>

            <button>Pair a Device</button>
          </div>
        </div>

        {/* Device Security */}
        <div className="card">
          <h2>Device Security</h2>

          <div className="device-security">
            <div className="security-section">
              <h3>Private Key Storage</h3>

              <p className="muted">
                Device private keys are stored securely on this Windows machine.
              </p>

              <button onClick={testSecureKeyStorage} disabled={testingKeys}>
                {testingKeys ? "Testing..." : "Test Secure Key Storage"}
              </button>

              {keyStorageStatus && (
                <p className="security-result">{keyStorageStatus}</p>
              )}
            </div>

            <div className="security-section">
              <h3>Device Identity</h3>

              <p className="muted">Permanent CLIPZEN device identifier.</p>

              <button onClick={loadDeviceId} disabled={loadingDeviceId}>
                {loadingDeviceId ? "Loading..." : "Get Device ID"}
              </button>

              {deviceId && (
                <div className="device-id">
                  <span>{deviceId}</span>
                </div>
              )}
            </div>

            <button onClick={getDevicePublicKeys}>Get Public Keys</button>
          </div>
        </div>

        {/* Pending Clipboard */}
        <div className="card">
          <h2>Pending Clipboard</h2>

          {pendingClipboard ? (
            <div className="pending-item">
              <div className="pending-content">
                <p>{pendingClipboard.text}</p>
              </div>

              <button onClick={sendPendingClipboard}>SEND</button>
            </div>
          ) : (
            <div className="empty-state">
              <p>No pending clipboard items</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
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
