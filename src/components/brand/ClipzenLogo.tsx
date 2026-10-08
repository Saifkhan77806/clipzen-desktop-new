import { ClipboardCheck } from "lucide-react";

type ClipzenLogoProps = {
  compact?: boolean;
};

export function ClipzenLogo({ compact = false }: ClipzenLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
        <ClipboardCheck className="size-5" strokeWidth={2.2} />
      </div>

      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
            CLIPZEN
          </div>

          <div className="mt-1 text-[10px] font-medium tracking-wide text-slate-400">
            Copy Once. Everywhere.
          </div>
        </div>
      )}
    </div>
  );
}
