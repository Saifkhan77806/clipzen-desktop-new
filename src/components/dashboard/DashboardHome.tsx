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
import type { Device } from "@/lib/api/devices";

type DashboardHomeProps = {
  devices: Device[];
};

export function DashboardHome({ devices }: DashboardHomeProps) {
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
          <div className="min-h-80 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
            <p className="text-sm font-semibold text-slate-950">
              Current Clipboard
            </p>
            <div className="mt-6">
              <ActivityCard />
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Your latest local clipboard content
            </p>

            <div className="mt-6 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <Clipboard className="mx-auto size-7 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  Nothing copied yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Copy something to see it here.
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-80 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
            <p className="text-sm font-semibold text-slate-950">
              Pending Clipboard
            </p>
            <div className="mt-6">
              <ActivityCard />
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Items waiting for your approval
            </p>

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
        onClose={() => setDeviceDrawerOpen(false)}
      />
    </main>
  );
}
