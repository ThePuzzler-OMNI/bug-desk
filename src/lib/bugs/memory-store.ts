/**
 * Ephemeral in-process store used when Postgres (Neon) is unset and PGLite
 * cannot boot on the serverless runtime (missing wasm data assets).
 * Warm instances share this; cold starts start empty. Set DATABASE_URL for
 * durable multi-instance storage.
 */
import { uid } from "@/lib/utils";
import {
  SITES,
  type BugFilters,
  type BugReport,
  type BugStats,
  type BugStatus,
  type BugType,
  type Severity,
  type SiteId,
} from "./types";

export type MemoryCreateInput = {
  siteId: string;
  type: BugType;
  severity: Severity;
  title: string;
  description: string;
  steps?: string | null;
  expected?: string | null;
  actual?: string | null;
  isMember?: boolean;
  userId?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  pageUrl?: string | null;
  pageTitle?: string | null;
  userAgent?: string | null;
  viewport?: string | null;
  screen?: string | null;
  language?: string | null;
  timezone?: string | null;
  referrer?: string | null;
  contextJson?: string | null;
};

const VALID_SITES = new Set(SITES.map((s) => s.id));

const g = globalThis as typeof globalThis & {
  __bugMemoryStore__?: BugReport[];
};

function bag(): BugReport[] {
  g.__bugMemoryStore__ ??= [];
  return g.__bugMemoryStore__;
}

export function memoryCreateBug(data: MemoryCreateInput): {
  id: string;
  isMember: boolean;
  siteId: string;
} {
  const isMember = Boolean(data.isMember);
  const siteId = (VALID_SITES.has(data.siteId as SiteId)
    ? data.siteId
    : "other") as SiteId;
  const now = new Date().toISOString();
  const id = uid("bug");
  const report: BugReport = {
    id,
    siteId,
    type: data.type,
    status: "new",
    severity: data.severity,
    title: data.title,
    description: data.description,
    steps: data.steps ?? null,
    expected: data.expected ?? null,
    actual: data.actual ?? null,
    isMember,
    userId: data.userId ?? null,
    reporterName:
      (data.reporterName && data.reporterName.trim()) ||
      (isMember ? "Member" : "Guest"),
    reporterEmail: data.reporterEmail ?? null,
    pageUrl: data.pageUrl ?? null,
    pageTitle: data.pageTitle ?? null,
    userAgent: data.userAgent ?? null,
    viewport: data.viewport ?? null,
    screen: data.screen ?? null,
    language: data.language ?? null,
    timezone: data.timezone ?? null,
    referrer: data.referrer ?? null,
    contextJson: data.contextJson ?? null,
    adminNotes: "",
    hoursEstimated: null,
    hoursActual: null,
    createdAt: now,
    updatedAt: now,
  };
  bag().unshift(report);
  return { id, isMember, siteId };
}

function matches(r: BugReport, filters: BugFilters): boolean {
  if (filters.siteId && filters.siteId !== "all" && r.siteId !== filters.siteId)
    return false;
  if (filters.isMember === true && !r.isMember) return false;
  if (filters.isMember === false && r.isMember) return false;
  if (filters.status && filters.status !== "all" && r.status !== filters.status)
    return false;
  if (filters.type && filters.type !== "all" && r.type !== filters.type)
    return false;
  if (
    filters.severity &&
    filters.severity !== "all" &&
    r.severity !== filters.severity
  )
    return false;
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    const hay = [
      r.title,
      r.description,
      r.reporterName ?? "",
      r.pageUrl ?? "",
    ]
      .join("\n")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

const SEV_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function memoryListBugs(filters: BugFilters = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  let items = bag().filter((r) => matches(r, filters));
  if (filters.sort === "oldest") {
    items = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (filters.sort === "severity") {
    items = [...items].sort(
      (a, b) =>
        SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
        b.createdAt.localeCompare(a.createdAt),
    );
  } else {
    items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const total = items.length;
  return {
    items: items.slice(offset, offset + limit),
    total,
    limit,
    offset,
  };
}

export function memoryGetBug(id: string): BugReport | null {
  return bag().find((r) => r.id === id) ?? null;
}

export function memoryUpdateBug(input: {
  id: string;
  status?: BugStatus;
  severity?: Severity;
  adminNotes?: string;
  hoursEstimated?: number | null;
  hoursActual?: number | null;
}): BugReport {
  const idx = bag().findIndex((r) => r.id === input.id);
  if (idx < 0) throw new Error("Not found");
  const cur = bag()[idx];
  const next: BugReport = {
    ...cur,
    status: input.status ?? cur.status,
    severity: input.severity ?? cur.severity,
    adminNotes:
      input.adminNotes !== undefined ? input.adminNotes : cur.adminNotes,
    hoursEstimated:
      input.hoursEstimated !== undefined
        ? input.hoursEstimated
        : cur.hoursEstimated,
    hoursActual:
      input.hoursActual !== undefined ? input.hoursActual : cur.hoursActual,
    updatedAt: new Date().toISOString(),
  };
  bag()[idx] = next;
  return next;
}

export function memoryGetStats(): BugStats {
  const items = bag();
  const closed = new Set(["resolved", "wont_fix", "duplicate"]);
  const bySiteMap = new Map<string, number>();
  const byStatusMap = new Map<string, number>();
  const bySeverityMap = new Map<string, number>();
  let open = 0;
  let members = 0;
  let guests = 0;
  for (const r of items) {
    bySiteMap.set(r.siteId, (bySiteMap.get(r.siteId) ?? 0) + 1);
    byStatusMap.set(r.status, (byStatusMap.get(r.status) ?? 0) + 1);
    bySeverityMap.set(r.severity, (bySeverityMap.get(r.severity) ?? 0) + 1);
    if (!closed.has(r.status)) open += 1;
    if (r.isMember) members += 1;
    else guests += 1;
  }
  return {
    total: items.length,
    open,
    members,
    guests,
    bySite: [...bySiteMap.entries()].map(([siteId, count]) => ({
      siteId,
      count,
    })),
    byStatus: [...byStatusMap.entries()].map(([status, count]) => ({
      status,
      count,
    })),
    bySeverity: [...bySeverityMap.entries()].map(([severity, count]) => ({
      severity,
      count,
    })),
  };
}

export function memoryCount(): number {
  return bag().length;
}
