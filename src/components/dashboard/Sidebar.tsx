import {
  Activity,
  Clipboard,
  LayoutDashboard,
  MonitorSmartphone,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type SidebarProps = {
  activeItem?: string;
  onNavigate?: (item: string) => void;
};

const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
  },
  {
    id: "devices",
    label: "Devices",
    icon: MonitorSmartphone,
  },
];

export function Sidebar({
  activeItem = "dashboard",
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200/80 bg-white">
      <div className="flex-1 p-4">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Workspace
        </div>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeItem === item.id;

            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => onNavigate?.(item.id)}
                className={[
                  "h-10 w-full justify-start gap-3 rounded-xl px-3 text-sm",
                  active
                    ? "bg-slate-100 font-medium text-slate-950"
                    : "font-normal text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Preferences
        </div>

        <Button
          variant="ghost"
          onClick={() => onNavigate?.("settings")}
          className="h-10 w-full justify-start gap-3 rounded-xl px-3 text-sm font-normal text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        >
          <Settings className="size-4" strokeWidth={1.8} />
          Settings
        </Button>
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-white shadow-sm">
              <Clipboard className="size-3.5 text-slate-700" />
            </div>

            <span className="text-xs font-semibold text-slate-800">
              CLIPZEN
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Your clipboard, available everywhere.
          </p>
        </div>
      </div>
    </aside>
  );
}
