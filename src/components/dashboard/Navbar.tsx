import { ChevronDown, LogOut, Settings, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ClipzenLogo } from "@/components/brand/ClipzenLogo";

type NavbarProps = {
  authenticated: boolean;
  email?: string;
  onSignOut?: () => void;
  onGetStarted?: () => void;
};

export function Navbar({
  authenticated,
  email,
  onSignOut,
  onGetStarted,
}: NavbarProps) {
  const initials = email?.slice(0, 1).toUpperCase() ?? "C";

  return (
    <header className="flex h-18 items-center justify-between border-b border-slate-200/80 bg-white px-6">
      <ClipzenLogo />

      {authenticated ? (
        <div className="flex items-center gap-4">
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <ShieldCheck className="size-3.5" />
            Synced
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-10 gap-2 rounded-xl px-2 hover:bg-slate-100"
                />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-slate-950 text-xs font-medium text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 sm:block">
                {email ?? "Account"}
              </span>

              <ChevronDown className="size-4 text-slate-400" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem className="gap-2">
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onSignOut}
                className="gap-2 text-red-600 focus:text-red-600"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Button
          onClick={onGetStarted}
          className="rounded-xl bg-slate-950 px-5 hover:bg-slate-800"
        >
          Get started
        </Button>
      )}
    </header>
  );
}
