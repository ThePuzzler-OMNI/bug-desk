import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Users,
  UserX,
  Inbox,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  getBugStats,
  listBugs,
  seedDemoBugs,
  updateBug,
} from "@/lib/bugs/server";
import {
  BUG_STATUSES,
  BUG_TYPES,
  SEVERITIES,
  SEVERITY_LABELS,
  SITES,
  STATUS_LABELS,
  TYPE_LABELS,
  type BugFilters,
  type BugReport,
  type BugStats,
  type BugStatus,
  type Severity,
} from "@/lib/bugs/types";
import { formatRelative, cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input, Label, Textarea } from "./ui/input";
import { Select } from "./ui/select";

function severityVariant(s: Severity) {
  if (s === "critical") return "critical" as const;
  if (s === "high") return "high" as const;
  if (s === "medium") return "medium" as const;
  return "low" as const;
}

function siteName(id: string) {
  return SITES.find((s) => s.id === id)?.name ?? id;
}

export function AdminDashboard({
  initialSiteId,
  initialIsMember,
}: {
  initialSiteId?: string;
  initialIsMember?: boolean | null;
}) {
  const [filters, setFilters] = useState<BugFilters>({
    siteId: initialSiteId && initialSiteId !== "all" ? initialSiteId : undefined,
    isMember:
      initialIsMember === true || initialIsMember === false
        ? initialIsMember
        : null,
    sort: "newest",
    limit: 50,
    offset: 0,
  });
  const [items, setItems] = useState<BugReport[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await seedDemoBugs();
      const [list, st] = await Promise.all([
        listBugs({ data: filters }),
        getBugStats(),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setStats(st);
      if (selected) {
        const fresh = list.items.find((i) => i.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, selected?.id]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const memberPct = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.members / stats.total) * 100);
  }, [stats]);

  async function patchSelected(patch: {
    status?: BugStatus;
    severity?: Severity;
    adminNotes?: string;
  }) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateBug({
        data: { id: selected.id, ...patch },
      });
      setSelected(updated);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      const st = await getBugStats();
      setStats(st);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Steward dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Sort and sift member vs guest reports across every site.
          </p>
          <p className="mt-2 text-xs text-[var(--color-subtle)]">
            Wired from{" "}
            <a
              className="underline hover:text-[var(--color-fg)]"
              href="https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html#bugs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Admin · One Mission → Bugs
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Link to="/report" search={{}}>
            <Button size="sm">New report</Button>
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Inbox}
            label="Total"
            value={String(stats.total)}
            hint={`${stats.open} open`}
          />
          <StatCard
            icon={Users}
            label="Members"
            value={String(stats.members)}
            hint={`${memberPct}% of reports`}
            accent="member"
          />
          <StatCard
            icon={UserX}
            label="Guests"
            value={String(stats.guests)}
            hint="Anonymous / unsigned"
            accent="guest"
          />
          <StatCard
            icon={AlertTriangle}
            label="Critical + high"
            value={String(
              (stats.bySeverity.find((s) => s.severity === "critical")
                ?.count ?? 0) +
                (stats.bySeverity.find((s) => s.severity === "high")?.count ??
                  0),
            )}
            hint="Needs attention"
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <Label>Site</Label>
            <Select
              value={filters.siteId ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  siteId: e.target.value === "all" ? undefined : e.target.value,
                  offset: 0,
                }))
              }
            >
              <option value="all">All sites</option>
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Membership</Label>
            <Select
              value={
                filters.isMember === true
                  ? "member"
                  : filters.isMember === false
                    ? "guest"
                    : "all"
              }
              onChange={(e) => {
                const v = e.target.value;
                setFilters((f) => ({
                  ...f,
                  isMember:
                    v === "member" ? true : v === "guest" ? false : null,
                  offset: 0,
                }));
              }}
            >
              <option value="all">Members + guests</option>
              <option value="member">Members only</option>
              <option value="guest">Guests only</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={filters.status ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value === "all" ? undefined : e.target.value,
                  offset: 0,
                }))
              }
            >
              <option value="all">All statuses</option>
              {BUG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={filters.type ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  type: e.target.value === "all" ? undefined : e.target.value,
                  offset: 0,
                }))
              }
            >
              <option value="all">All types</option>
              {BUG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select
              value={filters.severity ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  severity:
                    e.target.value === "all" ? undefined : e.target.value,
                  offset: 0,
                }))
              }
            >
              <option value="all">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Sort</Label>
            <Select
              value={filters.sort ?? "newest"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sort: e.target.value as BugFilters["sort"],
                  offset: 0,
                }))
              }
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="severity">Severity</option>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-subtle)]" />
              <Input
                className="pl-9"
                placeholder="Search title, description, reporter, URL…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilters((f) => ({ ...f, q: q.trim() || undefined, offset: 0 }));
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setFilters((f) => ({ ...f, q: q.trim() || undefined, offset: 0 }))
              }
            >
              Apply search
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-[var(--color-border)] py-3">
            <CardTitle className="text-base">
              Reports{" "}
              <span className="font-normal text-[var(--color-muted)]">
                ({total})
              </span>
            </CardTitle>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 && !loading ? (
              <p className="p-6 text-sm text-[var(--color-muted)]">
                No reports match these filters.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-[var(--color-elevated)]",
                        selected?.id === item.id && "bg-[var(--color-elevated)]",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={severityVariant(item.severity)}>
                          {SEVERITY_LABELS[item.severity]}
                        </Badge>
                        <Badge variant={item.isMember ? "member" : "guest"}>
                          {item.isMember ? "Member" : "Guest"}
                        </Badge>
                        <Badge variant="info">{TYPE_LABELS[item.type]}</Badge>

                        <span className="text-xs text-[var(--color-subtle)]">
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <div className="font-medium leading-snug">{item.title}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted)]">
                        <span>{siteName(item.siteId)}</span>
                        <span>{formatRelative(item.createdAt)}</span>
                        {item.reporterName && <span>{item.reporterName}</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader className="border-b border-[var(--color-border)] py-3">
            <CardTitle className="text-base">
              {selected ? "Detail" : "Select a report"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 text-sm">
            {!selected ? (
              <p className="text-[var(--color-muted)]">
                Click a row to review full context, update status, and leave notes.
              </p>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-semibold leading-snug">
                    {selected.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-[var(--color-muted)]">
                    {selected.description}
                  </p>
                </div>
                <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs">
                  <Row k="Site" v={siteName(selected.siteId)} />
                  <Row
                    k="Membership"
                    v={selected.isMember ? "Member" : "Guest"}
                  />
                  <Row k="Reporter" v={selected.reporterName || "—"} />
                  <Row k="Email" v={selected.reporterEmail || "—"} />
                  <Row
                    k="Page"
                    v={
                      selected.pageUrl ? (
                        <a
                          href={selected.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Row k="Viewport" v={selected.viewport || "—"} />
                  <Row k="UA" v={selected.userAgent || "—"} />
                  <Row k="TZ" v={selected.timezone || "—"} />
                  <Row k="Created" v={new Date(selected.createdAt).toLocaleString()} />
                </div>
                {selected.steps && (
                  <div>
                    <div className="text-xs font-medium text-[var(--color-muted)]">
                      Steps
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{selected.steps}</p>
                  </div>
                )}
                {(selected.expected || selected.actual) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selected.expected && (
                      <div>
                        <div className="text-xs font-medium text-[var(--color-muted)]">
                          Expected
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">
                          {selected.expected}
                        </p>
                      </div>
                    )}
                    {selected.actual && (
                      <div>
                        <div className="text-xs font-medium text-[var(--color-muted)]">
                          Actual
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">
                          {selected.actual}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label>Status</Label>
                  <Select
                    value={selected.status}
                    disabled={saving}
                    onChange={(e) =>
                      void patchSelected({
                        status: e.target.value as BugStatus,
                      })
                    }
                  >
                    {BUG_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select
                    value={selected.severity}
                    disabled={saving}
                    onChange={(e) =>
                      void patchSelected({
                        severity: e.target.value as Severity,
                      })
                    }
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {SEVERITY_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Admin notes</Label>
                  <Textarea
                    defaultValue={selected.adminNotes}
                    key={selected.id + selected.updatedAt}
                    rows={3}
                    onBlur={(e) => {
                      if (e.target.value !== selected.adminNotes) {
                        void patchSelected({ adminNotes: e.target.value });
                      }
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-[var(--color-subtle)]">{k}</span>
      <span className="min-w-0 break-all">{v}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent?: "member" | "guest";
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]",
            accent === "member" && "text-emerald-400",
            accent === "guest" && "text-amber-300",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs text-[var(--color-muted)]">{label}</div>
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          <div className="text-xs text-[var(--color-subtle)]">{hint}</div>
        </div>
      </CardContent>
    </Card>
  );
}
