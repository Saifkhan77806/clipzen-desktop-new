import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "../supabase";
import { Navbar } from "@/components/dashboard/Navbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import {
  acceptPairing,
  createPairing,
  getDevices,
  type CreatePairingResponse,
} from "@/lib/api/devices";
import type { Device } from "@/lib/api/devices";
import type { ActivityItem } from "@/components/dashboard/ActivityCard";
import {
  acceptClipboardDelivery,
  declineClipboardDelivery,
  markClipboardDeliveryApplied,
  getClipboardStatus,
  sendClipboard,
  type ClipboardDeliveryStatus,
} from "@/lib/api/clipboard";
import "./App.css";

type ClipboardChangedPayload = {
  text: string;
};

type ClipboardDeliveryReceivedPayload = {
  deliveryId: string;
  clipboardItemId: string;
  sourceDeviceId: string;
};

type PendingClipboard = {
  deliveryId?: string;
  clipboardItemId?: string;
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
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const [clipboardStatus, setClipboardStatus] =
    useState<ClipboardDeliveryStatus>("pending");

  const [clipboardItemId, setClipboardItemId] = useState<string | null>(null);

  const [pairingResult, setPairingResult] =
    useState<CreatePairingResponse | null>(null);

  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const [pairingAcceptLoading, setPairingAcceptLoading] = useState(false);
  const [pairingAcceptError, setPairingAcceptError] = useState<string | null>(
    null,
  );

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

          setAccessToken(session.access_token);

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
      setAccessToken(session?.access_token ?? null);
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

      setAccessToken(data.session.access_token);

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
        setAccessToken(data.session.access_token);
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
      setAccessToken(null);
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

  const handlePairDevice = async () => {
    setPairingError(null);
    setPairingResult(null);

    if (!deviceId) {
      setPairingError(
        "This device is not registered yet. Please wait and try again.",
      );
      return;
    }

    setPairingLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please sign in before pairing a device.");
      }

      const result = await createPairing(session.access_token, deviceId);

      setPairingResult(result);
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : String(error));
    } finally {
      setPairingLoading(false);
    }
  };

  const handleAcceptPairing = async (pairingToken: string) => {
    setPairingAcceptError(null);

    if (!deviceId) {
      setPairingAcceptError(
        "This device is not registered yet. Please wait and try again.",
      );
      return;
    }

    setPairingAcceptLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please sign in before pairing a device.");
      }

      await acceptPairing(session.access_token, deviceId, pairingToken);

      const updatedDevices = await getDevices(session.access_token);
      setDevices(updatedDevices);
      setPairingResult(null);

      setPairingAcceptError(null);
    } catch (error) {
      setPairingAcceptError(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setPairingAcceptLoading(false);
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

  const addActivity = (item: Omit<ActivityItem, "id">) => {
    setActivity((current) =>
      [
        {
          ...item,
          id: crypto.randomUUID(),
        },
        ...current,
      ].slice(0, 8),
    );
  };

  /*
   * =====================================================
   * CLIPBOARD LISTENER
   * =====================================================
   */

  useEffect(() => {
    let unlistenClipboard: (() => void) | undefined;
    let unlistenDelivery: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenClipboard = await listen<ClipboardChangedPayload>(
        "clipboard-changed",
        (event) => {
          console.log("CLIPZEN: Clipboard changed:", event.payload.text);

          setClipboardText(event.payload.text);

          setPendingClipboard({
            text: event.payload.text,
          });

          addActivity({
            type: "pending",
            title: "New clipboard item",
            device: "This device",
            time: "Just now",
          });
        },
      );

      unlistenDelivery = await listen<ClipboardDeliveryReceivedPayload>(
        "clipboard-delivery-received",
        (event) => {
          console.log(
            "CLIPZEN: Clipboard delivery received:",
            event.payload.deliveryId,
            event.payload.clipboardItemId,
          );

          setClipboardItemId(event.payload.clipboardItemId);
          setClipboardStatus("received");

          void (async () => {
            try {
              const text = await invoke<string | null>(
                "decrypt_pending_clipboard",
              );

              if (text === null) {
                console.error(
                  "CLIPZEN: Pending clipboard could not be decrypted.",
                );
                return;
              }

              setPendingClipboard({
                deliveryId: event.payload.deliveryId,
                clipboardItemId: event.payload.clipboardItemId,
                text,
              });
            } catch (error) {
              console.error(
                "CLIPZEN: Failed to decrypt pending clipboard:",
                error,
              );
            }
          })();

          addActivity({
            type: "received",
            title: "Clipboard received",
            device:
              devices.find(
                (device) => device.id === event.payload.sourceDeviceId,
              )?.deviceName ?? "Another device",
            time: "Just now",
          });
        },
      );
    };

    setupListeners();

    return () => {
      unlistenClipboard?.();
      unlistenDelivery?.();
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
    if (!clipboardItemId || !accessToken) {
      return;
    }

    let cancelled = false;

    const loadClipboardStatus = async () => {
      try {
        const result = await getClipboardStatus(accessToken, clipboardItemId);

        if (!cancelled) {
          setClipboardStatus(result.status);
        }
      } catch (error) {
        console.error("CLIPZEN: Failed to load clipboard status:", error);
      }
    };

    loadClipboardStatus();

    return () => {
      cancelled = true;
    };
  }, [clipboardItemId, accessToken]);

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

  const sendPendingClipboard = async () => {
    if (!pendingClipboard || !accessToken || !deviceId) {
      return;
    }

    try {
      setClipboardStatus("sent");

      const result = await sendClipboard(
        accessToken,
        deviceId,
        pendingClipboard.text,
      );

      setClipboardItemId(result.clipboardItemId);

      setClipboardStatus(result.deliverySummary.sent > 0 ? "sent" : "pending");

      setPendingClipboard(null);

      addActivity({
        type: "sent",
        title: "Clipboard sent",
        device: "Paired devices",
        time: "Just now",
      });
    } catch (error) {
      console.error("CLIPZEN: Failed to send clipboard:", error);

      setClipboardStatus("failed");
    }
  };

  const acceptPendingClipboard = async () => {
    if (!pendingClipboard?.deliveryId || !accessToken) {
      return;
    }

    try {
      setClipboardStatus("accepted");

      await acceptClipboardDelivery(accessToken, pendingClipboard.deliveryId);

      await invoke("apply_pending_clipboard");

      await markClipboardDeliveryApplied(
        accessToken,
        pendingClipboard.deliveryId,
      );

      setClipboardStatus("applied");

      setClipboardText(pendingClipboard.text);

      addActivity({
        type: "received",
        title: "Clipboard applied",
        device: "This device",
        time: "Just now",
      });
    } catch (error) {
      console.error("CLIPZEN: Failed to accept clipboard:", error);

      setClipboardStatus("failed");
    }
  };

  const declinePendingClipboard = async () => {
    if (!pendingClipboard?.deliveryId || !accessToken) {
      return;
    }

    try {
      await declineClipboardDelivery(accessToken, pendingClipboard.deliveryId);

      setClipboardStatus("declined");
      setPendingClipboard(null);
      setClipboardItemId(null);

      addActivity({
        type: "received",
        title: "Clipboard declined",
        device: "This device",
        time: "Just now",
      });
    } catch (error) {
      console.error("CLIPZEN: Failed to decline clipboard:", error);
    }
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

              <DashboardHome
                devices={devices}
                clipboardText={clipboardText}
                onRefreshClipboard={refreshClipboard}
                pendingClipboard={pendingClipboard}
                onSendPendingClipboard={sendPendingClipboard}
                clipboardStatus={clipboardStatus}
                onAcceptPendingClipboard={acceptPendingClipboard}
                onDeclinePendingClipboard={declinePendingClipboard}
                activity={activity}
                onPairDevice={handlePairDevice}
                pairingResult={pairingResult}
                pairingLoading={pairingLoading}
                pairingError={pairingError}
                onAcceptPairing={handleAcceptPairing}
                pairingAcceptLoading={pairingAcceptLoading}
                pairingAcceptError={pairingAcceptError}
              />
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
