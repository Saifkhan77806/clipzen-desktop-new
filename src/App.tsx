import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "../supabase";
import { Navbar } from "@/components/dashboard/Navbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { getDevices } from "@/lib/api/devices";
import type { Device } from "@/lib/api/devices";
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

  const [devices, setDevices] = useState<Device[]>([]);

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

  useEffect(() => {
    if (!authenticated) {
      setDevices([]);
      return;
    }

    loadDevices();
  }, [authenticated]);

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

  const loadDevices = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setDevices([]);
        return;
      }

      const nextDevices = await getDevices(session.access_token);

      setDevices(nextDevices);
    } catch (error) {
      console.error("CLIPZEN: Failed to load devices:", error);
      setDevices([]);
    }
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      {authLoading ? (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <span className="text-sm font-semibold">C</span>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading CLIPZEN...
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Preparing your workspace
            </p>
          </div>
        </div>
      ) : (
        <>
          <Navbar
            authenticated={authenticated}
            email={authEmail ?? undefined}
            onSignOut={signOut}
            onGetStarted={() => {
              setAuthMode("register");
              setAuthError(null);
              setAuthMessage(null);
            }}
          />

          {authenticated ? (
            <div className="flex min-h-[calc(100vh-72px)]">
              <Sidebar />

              <DashboardHome devices={devices} />
            </div>
          ) : (
            <main className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6 py-12">
              <div className="w-full max-w-md">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm shadow-slate-200/50">
                  <div className="mb-8">
                    <p className="text-sm font-medium text-slate-500">
                      Welcome to CLIPZEN
                    </p>

                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {authMode === "login"
                        ? "Sign in to your workspace"
                        : "Create your CLIPZEN account"}
                    </h1>

                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {authMode === "login"
                        ? "Connect your devices and keep your clipboard available everywhere."
                        : "Create an account to securely connect your devices."}
                    </p>
                  </div>

                  <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError(null);
                        setAuthMessage(null);
                      }}
                      className={[
                        "rounded-lg px-3 py-2 text-sm font-medium transition",
                        authMode === "login"
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      ].join(" ")}
                    >
                      Login
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError(null);
                        setAuthMessage(null);
                      }}
                      className={[
                        "rounded-lg px-3 py-2 text-sm font-medium transition",
                        authMode === "register"
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800",
                      ].join(" ")}
                    >
                      Register
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-xs font-medium text-slate-700"
                      >
                        Email
                      </label>

                      <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={authSubmitting}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="mb-2 block text-xs font-medium text-slate-700"
                      >
                        Password
                      </label>

                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={authSubmitting}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>

                    {authMode === "register" && (
                      <div>
                        <label
                          htmlFor="confirm-password"
                          className="mb-2 block text-xs font-medium text-slate-700"
                        >
                          Confirm password
                        </label>

                        <input
                          id="confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          disabled={authSubmitting}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={authMode === "login" ? signIn : registerAccount}
                      disabled={authSubmitting}
                      className="h-11 w-full rounded-xl bg-slate-950 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {authSubmitting
                        ? "Please wait..."
                        : authMode === "login"
                          ? "Sign in"
                          : "Create account"}
                    </button>
                  </div>

                  {authError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {authError}
                    </div>
                  )}

                  {authMessage && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {authMessage}
                    </div>
                  )}
                </div>
              </div>
            </main>
          )}
        </>
      )}
    </div>
  );
}

export default App;
