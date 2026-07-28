import { Link, useRouterState } from "@tanstack/react-router";
import { Bug, LayoutDashboard, Menu, PenLine, X } from "lucide-react";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const nav = [
  { to: "/", label: "Overview", icon: Bug },
  { to: "/report", label: "Report", icon: PenLine },
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
] as const;

const CMD_CNTR =
  "https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html#bugs";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                <Bug className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">Bug Desk</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-[var(--color-elevated)] text-[var(--color-fg)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <a
                href={CMD_CNTR}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              >
                Cmd Cntr
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isPending ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-[var(--color-elevated)]" />
            ) : (
              <>
                <SignedOut>
                  <Link to="/login">
                    <Button variant="outline" size="sm">
                      Sign in
                    </Button>
                  </Link>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-[var(--color-border)] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-fg)]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <a
                href={CMD_CNTR}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--color-muted)]"
              >
                Cmd Cntr
              </a>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-subtle)]">
        Multi-site bug desk · members and guests · wired to Admin · One Mission
      </footer>
    </div>
  );
}
