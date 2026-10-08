import { ArrowDownToLine, ArrowUpFromLine, Check, Clock3 } from "lucide-react";

type ActivityStatus = "sent" | "received" | "pending";

type ActivityItem = {
  id: string;
  type: ActivityStatus;
  title: string;
  device: string;
  time: string;
};

type ActivityCardProps = {
  items?: ActivityItem[];
};

const activityConfig = {
  sent: {
    icon: ArrowUpFromLine,
    label: "Sent",
    iconClass: "bg-slate-100 text-slate-600",
  },
  received: {
    icon: ArrowDownToLine,
    label: "Received",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  pending: {
    icon: Clock3,
    label: "Pending",
    iconClass: "bg-amber-50 text-amber-600",
  },
};

export function ActivityCard({ items = [] }: ActivityCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Recent Activity
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Your latest clipboard activity
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-medium text-slate-500 transition hover:text-slate-950"
        >
          View all
        </button>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-100">
          {items.map((item) => {
            const config = activityConfig[item.type];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${config.iconClass}`}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item.title}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {config.label} · {item.device}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-slate-400">
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 flex min-h-32 items-center justify-center rounded-xl bg-slate-50">
          <div className="text-center">
            <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-white shadow-sm">
              <Check className="size-4 text-slate-300" />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-500">
              No recent activity
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Your clipboard activity will appear here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
