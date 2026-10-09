import { CheckCircle2, Copy, Monitor, Smartphone, X } from "lucide-react";
import { useState } from "react";

type Device = {
  id: string;
  name: string;
  platform: "windows" | "android" | "ios" | "macos" | "linux";
  online: boolean;
};

type PairingResult = {
  pairingToken: string;
  expiresAt: string;
  device: {
    deviceId: string;
    deviceName: string;
    platform: string;
  };
};

type DeviceDrawerProps = {
  open: boolean;
  devices?: Device[];
  onClose: () => void;
  onPairDevice?: () => void;
  pairingResult?: PairingResult | null;
  pairingLoading?: boolean;
  pairingError?: string | null;
  onAcceptPairing?: (pairingToken: string) => void;
  pairingAcceptLoading?: boolean;
  pairingAcceptError?: string | null;
};

function DeviceIcon({ platform }: { platform: Device["platform"] }) {
  if (platform === "android" || platform === "ios") {
    return <Smartphone className="size-5" />;
  }

  return <Monitor className="size-5" />;
}

export function DeviceDrawer({
  open,
  devices = [],
  onClose,
  onPairDevice,
  pairingResult,
  pairingLoading = false,
  pairingError,
  onAcceptPairing,
  pairingAcceptLoading = false,
  pairingAcceptError,
}: DeviceDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [pairingTokenInput, setPairingTokenInput] = useState("");

  if (!open) {
    return null;
  }

  const copyPairingToken = async () => {
    if (!pairingResult?.pairingToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pairingResult.pairingToken);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("CLIPZEN: Failed to copy pairing token:", error);
    }
  };

  const handleJoinDevice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const token = pairingTokenInput.trim();

    if (!token || pairingAcceptLoading) {
      return;
    }

    onAcceptPairing?.(token);
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close device drawer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Paired devices
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Devices trusted to sync with CLIPZEN.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close device drawer"
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Device list */}
        <div className="flex-1 overflow-y-auto p-6">
          {devices.length > 0 ? (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 p-4"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                    <DeviceIcon platform={device.platform} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {device.name}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={[
                          "size-1.5 rounded-full",
                          device.online ? "bg-emerald-500" : "bg-slate-300",
                        ].join(" ")}
                      />

                      <span className="text-xs text-slate-400">
                        {device.online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>

                  {device.online && (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-slate-50 px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Monitor className="size-5 text-slate-300" />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-700">
                No paired devices
              </p>

              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                Pair another device to start moving clipboard content between
                your devices.
              </p>
            </div>
          )}
        </div>

        {/* Generate pairing code */}
        <div className="border-t border-slate-100 p-6">
          {pairingResult ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Pairing code
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Enter this code on the device you want to pair.
                  </p>
                </div>

                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="break-all font-mono text-xs leading-relaxed text-slate-700">
                  {pairingResult.pairingToken}
                </p>
              </div>

              <button
                type="button"
                onClick={copyPairingToken}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy pairing code"}
              </button>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                Expires at{" "}
                {new Date(pairingResult.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPairDevice}
              disabled={pairingLoading}
              className="h-11 w-full rounded-xl bg-slate-950 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pairingLoading
                ? "Generating pairing code..."
                : "Pair a new device"}
            </button>
          )}

          {pairingError && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-600"
            >
              {pairingError}
            </p>
          )}
        </div>

        {/* Join another device */}
        <div className="border-t border-slate-100 px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Join a device
          </h3>

          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Enter the pairing code generated by your other device.
          </p>

          <form className="mt-3 space-y-3" onSubmit={handleJoinDevice}>
            <textarea
              value={pairingTokenInput}
              onChange={(event) => setPairingTokenInput(event.target.value)}
              placeholder="Paste pairing code here"
              rows={3}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              disabled={pairingAcceptLoading}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-xs text-slate-700 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-400 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={
                !pairingTokenInput.trim() ||
                pairingAcceptLoading ||
                !onAcceptPairing
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pairingAcceptLoading ? "Pairing device..." : "Join device"}
            </button>
          </form>

          {pairingAcceptError && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-600"
            >
              {pairingAcceptError}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
