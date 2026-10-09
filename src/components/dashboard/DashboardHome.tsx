import { useState } from "react";
import { DeviceDrawer } from "./DeviceDrawer";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clipboard,
  MonitorSmartphone,
} from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { StatCard } from "./StatCard";
import type { ActivityItem } from "./ActivityCard";
import type { Device } from "@/lib/api/devices";
import type { ClipboardDeliveryStatus } from "@/lib/api/clipboard";
import type { CreatePairingResponse } from "@/lib/api/devices";

type PendingClipboard = {
  clipboardItemId?: string;
  text: string;
};

type DashboardHomeProps = {
  devices: Device[];
  clipboardText: string | null;
  onRefreshClipboard: () => void;
  pendingClipboard: PendingClipboard | null;
  onSendPendingClipboard: () => void;
  onAcceptPendingClipboard: () => void;
  onDeclinePendingClipboard: () => void;
  clipboardStatus: ClipboardDeliveryStatus;
  activity: ActivityItem[];
  onPairDevice: () => void;
  pairingResult: CreatePairingResponse | null;
  pairingLoading: boolean;
  pairingError: string | null;
  onAcceptPairing: (pairingToken: string) => void;
  pairingAcceptLoading: boolean;
  pairingAcceptError: string | null;
};

export function DashboardHome({
  devices,
  clipboardText,
  onRefreshClipboard,
  pendingClipboard,
  onSendPendingClipboard,
  onAcceptPendingClipboard,
  onDeclinePendingClipboard,
  clipboardStatus,
  activity,
  onPairDevice,
  pairingResult,
  pairingLoading,
  pairingError,
  onAcceptPairing,
  pairingAcceptLoading,
  pairingAcceptError,
}: DashboardHomeProps) {
  const [deviceDrawerOpen, setDeviceDrawerOpen] = useState(false);

  return (
    <main className="min-w-0 flex-1 overflow-auto bg-slate-50">
      <div className="mx-auto w-full max-w-7xl p-6 lg:p-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Workspace</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Your clipboard, everywhere.
          </h1>

          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Keep your devices connected and move clipboard content securely
            between them.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Clipboard items"
            value="24"
            description="This month"
            icon={Clipboard}
          />

          <StatCard
            label="Sent"
            value="18"
            description="Across all devices"
            icon={ArrowUpFromLine}
          />

          <StatCard
            label="Received"
            value="21"
            description="Across all devices"
            icon={ArrowDownToLine}
          />

          <button
            type="button"
            onClick={() => setDeviceDrawerOpen(true)}
            className="text-left"
          >
            <StatCard
              label="Connected devices"
              value={
                devices.filter((device) => device.connectionStatus === "online")
                  .length
              }
              description={`${devices.length} paired`}
              icon={MonitorSmartphone}
            />
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          {/* Current Clipboard */}
          <div className="min-h-80 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Current Clipboard
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your latest local clipboard content
                </p>
              </div>

              <button
                type="button"
                onClick={onRefreshClipboard}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Refresh
              </button>
            </div>

            <div className="mt-6 min-h-48 rounded-xl border border-slate-100 bg-slate-50 p-5">
              {clipboardText ? (
                <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {clipboardText}
                </p>
              ) : (
                <div className="flex min-h-36 flex-col items-center justify-center text-center">
                  <Clipboard className="size-7 text-slate-300" />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Nothing copied yet
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Copy something to see it here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* pending clipboard */}
          <div className="min-h-80 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Pending Clipboard
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Items waiting for your approval
                </p>
              </div>

              {pendingClipboard && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-amber-700">
                  {clipboardStatus}
                </span>
              )}
            </div>

            {pendingClipboard ? (
              <div className="mt-6">
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <p className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {pendingClipboard.text}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Delivery status
                  </p>

                  <div className="space-y-2">
                    {(
                      [
                        ["pending", "Pending"],
                        ["sent", "Sent"],
                        ["received", "Received"],
                        ["accepted", "Accepted"],
                        ["applied", "Applied"],
                      ] as const
                    ).map(([status, label], index) => {
                      const currentStatus = clipboardStatus;

                      const statuses = [
                        "pending",
                        "sent",
                        "received",
                        "accepted",
                        "applied",
                      ];

                      const currentIndex = statuses.indexOf(currentStatus);
                      const statusIndex = index;

                      const complete = statusIndex <= currentIndex;
                      const current = status === currentStatus;

                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div
                            className={[
                              "flex size-5 items-center justify-center rounded-full border text-[9px]",
                              complete
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-300",
                            ].join(" ")}
                          >
                            {complete ? "✓" : ""}
                          </div>

                          <span
                            className={[
                              "text-xs",
                              current
                                ? "font-semibold text-slate-900"
                                : complete
                                  ? "text-slate-600"
                                  : "text-slate-400",
                            ].join(" ")}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {clipboardStatus === "pending" && (
                  <button
                    type="button"
                    onClick={onSendPendingClipboard}
                    className="mt-5 h-10 w-full rounded-xl bg-slate-950 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    Send to paired devices
                  </button>
                )}

                {clipboardStatus === "received" && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={onDeclinePendingClipboard}
                      className="h-10 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Decline
                    </button>

                    <button
                      type="button"
                      onClick={onAcceptPendingClipboard}
                      className="h-10 rounded-xl bg-slate-950 text-xs font-medium text-white transition hover:bg-slate-800"
                    >
                      Accept
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 flex min-h-48 items-center justify-center rounded-xl bg-slate-50">
                <div className="text-center">
                  <Clipboard className="mx-auto size-7 text-slate-300" />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    No pending items
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    You're all caught up.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mt-6">
            <ActivityCard items={activity} />
          </div>
        </div>
      </div>
      <DeviceDrawer
        open={deviceDrawerOpen}
        devices={devices.map((device) => ({
          id: device.id,
          name: device.deviceName,
          platform: device.platform,
          online: device.connectionStatus === "online",
        }))}
        onPairDevice={onPairDevice}
        pairingResult={pairingResult}
        pairingLoading={pairingLoading}
        pairingError={pairingError}
        onAcceptPairing={onAcceptPairing}
        pairingAcceptLoading={pairingAcceptLoading}
        pairingAcceptError={pairingAcceptError}
        onClose={() => setDeviceDrawerOpen(false)}
      />
    </main>
  );
}
