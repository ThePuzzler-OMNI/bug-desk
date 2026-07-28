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

export function AdminDashboard() {
  const [filters, setFilters] = useState<BugFilters>({
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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="grid gap-1 lg:col-span-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-subtle)]" />
              <Input
                className="pl-9"
                placeholder="Title, URL, reporter…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    setFilters((f) => ({ ...f, q: q.trim(), offset: 0 }));
                }}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Site</Label>
            <Select
              value={filters.siteId ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  siteId: e.target.value,
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
          <div className="grid gap-1">
            <Label>Member</Label>
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
              <option value="all">All</option>
              <option value="member">Members only</option>
              <option value="guest">Guests only</option>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Status</Label>
            <Select
              value={filters.status ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value,
                  offset: 0,
                }))
              }
            >
              <option value="all">All</option>
              {BUG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1">
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
          <div className="grid gap-1 sm:col-span-2 lg:col-span-6 lg:flex lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.type ?? "all"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type: e.target.value,
                    offset: 0,
                  }))
                }
                className="w-auto min-w-[8rem]"
              >
                <option value="all">All types</option>
                {BUG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.severity ?? "all"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    severity: e.target.value,
                    offset: 0,
                  }))
                }
                className="w-auto min-w-[8rem]"
              >
                <option value="all">All severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((f) => ({ ...f, q: q.trim(), offset: 0 }))
                }
              >
                Apply search
              </Button>
            </div>
            <p className="text-xs text-[var(--color-subtle)]">
              {total} matching · showing {items.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading reports…
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-[var(--color-muted)]">
                No reports match these filters.
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className={cn(
                  "w-full rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
                  selected?.id === item.id
                    ? "border-[var(--color-border-strong)] bg-[var(--color-elevated)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={item.isMember ? "member" : "guest"}>
                        {item.isMember ? "Member" : "Guest"}
                      </Badge>
                      <Badge variant={severityVariant(item.severity)}>
                        {SEVERITY_LABELS[item.severity]}
                      </Badge>
                      <Badge>{TYPE_LABELS[item.type]}</Badge>
                      <Badge variant="default">
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">
                      {item.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-subtle)]">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-subtle)]">
                  <span>{siteName(item.siteId)}</span>
                  {item.reporterName && <span>{item.reporterName}</span>}
                  {item.pageUrl && (
                    <span className="max-w-[220px] truncate font-mono">
                      {item.pageUrl.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={selected.isMember ? "member" : "guest"}>
                    {selected.isMember ? "Member" : "Guest"}
                  </Badge>
                  <Badge variant={severityVariant(selected.severity)}>
                    {SEVERITY_LABELS[selected.severity]}
                  </Badge>
                </div>
                <CardTitle className="text-base leading-snug">
                  {selected.title}
                </CardTitle>
                <p className="font-mono text-[11px] text-[var(--color-subtle)]">
                  {selected.id}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="whitespace-pre-wrap text-[var(--color-muted)]">
                  {selected.description}
                </p>
                {selected.steps && (
                  <Block label="Steps">{selected.steps}</Block>
                )}
                {(selected.expected || selected.actual) && (
                  <div className="grid gap-2">
                    {selected.expected && (
                      <Block label="Expected">{selected.expected}</Block>
                    )}
                    {selected.actual && (
                      <Block label="Actual">{selected.actual}</Block>
                    )}
                  </div>
                )}
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs">
                  <p className="mb-2 font-medium text-[var(--color-muted)]">
                    Context
                  </p>
                  <dl className="grid gap-1.5">
                    <Row k="Site" v={siteName(selected.siteId)} />
                    <Row k="Reporter" v={selected.reporterName ?? "—"} />
                    <Row k="Email" v={selected.reporterEmail ?? "—"} />
                    <Row k="Page" v={selected.pageUrl ?? "—"} mono />
                    <Row k="Viewport" v={selected.viewport ?? "—"} />
                    <Row k="Timezone" v={selected.timezone ?? "—"} />
                    <Row
                      k="UA"
                      v={(selected.userAgent ?? "—").slice(0, 100)}
                      mono
                    />
                    <Row
                      k="Created"
                      v={new Date(selected.createdAt).toLocaleString()}
                    />
                  </dl>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-1.5">
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
                  <div className="grid gap-1.5">
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
                  <div className="grid gap-1.5">
                    <Label>Steward notes</Label>
                    <Textarea
                      key={selected.id + "-notes"}
                      defaultValue={selected.adminNotes}
                      disabled={saving}
                      placeholder="Internal notes…"
                      onBlur={(e) => {
                        if (e.target.value !== selected.adminNotes) {
                          void patchSelected({ adminNotes: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-[var(--color-muted)]">
                Select a report to review context and update status.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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
            accent === "member" && "text-[var(--color-member)]",
            accent === "guest" && "text-[var(--color-guest)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          <p className="text-[11px] text-[var(--color-subtle)]">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Block({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-subtle)]">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-[var(--color-muted)]">{children}</p>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2">
      <dt className="text-[var(--color-subtle)]">{k}</dt>
      <dd className={cn("break-all text-[var(--color-muted)]", mono && "font-mono")}>
        {v}
      </dd>
    </div>
  );
}
