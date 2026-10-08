import { CheckCircle2, Monitor, Smartphone, Tablet, X } from "lucide-react";

type Device = {
  id: string;
  name: string;
  platform: "windows" | "android" | "ios" | "macos" | "linux";
  online: boolean;
};

type DeviceDrawerProps = {
  open: boolean;
  devices?: Device[];
  onClose: () => void;
  onPairDevice?: () => void;
};

function DeviceIcon({ platform }: { platform: Device["platform"] }) {
  if (platform === "android" || platform === "ios") {
    return <Smartphone className="size-5" />;
  }

  if (platform === "linux" || platform === "macos") {
    return <Monitor className="size-5" />;
  }

  return <Monitor className="size-5" />;
}

export function DeviceDrawer({
  open,
  devices = [],
  onClose,
  onPairDevice,
}: DeviceDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close device drawer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
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
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

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

        <div className="border-t border-slate-100 p-6">
          <button
            type="button"
            onClick={onPairDevice}
            className="h-11 w-full rounded-xl bg-slate-950 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Pair a new device
          </button>
        </div>
      </aside>
    </div>
  );
}
