import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
};

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          )}
        </div>

        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
          <Icon className="size-5" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
