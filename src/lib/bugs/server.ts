import { createServerFn } from "@tanstack/react-start";
import { getSql, usesMemoryBugStore } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { createBugReport, normalizeSubmitBody } from "./create";
import {
  memoryGetBug,
  memoryGetStats,
  memoryListBugs,
  memoryUpdateBug,
  memoryCount,
} from "./memory-store";
import type {
  BugFilters,
  BugReport,
  BugStats,
  BugStatus,
  Severity,
} from "./types";

type BugRow = {
  id: string;
  site_id: string;
  type: string;
  status: string;
  severity: string;
  title: string;
  description: string;
  steps: string | null;
  expected: string | null;
  actual: string | null;
  is_member: boolean;
  user_id: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  page_url: string | null;
  page_title: string | null;
  user_agent: string | null;
  viewport: string | null;
  screen: string | null;
  language: string | null;
  timezone: string | null;
  referrer: string | null;
  context_json: string | null;
  admin_notes: string;
  hours_estimated: number | string | null;
  hours_actual: number | string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIso(v: string | Date): string {
  if (v instanceof Date) return v.toISOString();
  return new Date(v).toISOString();
}

function mapRow(r: BugRow): BugReport {
  return {
    id: r.id,
    siteId: r.site_id,
    type: r.type as BugReport["type"],
    status: r.status as BugStatus,
    severity: r.severity as Severity,
    title: r.title,
    description: r.description,
    steps: r.steps,
    expected: r.expected,
    actual: r.actual,
    isMember: Boolean(r.is_member),
    userId: r.user_id,
    reporterName: r.reporter_name,
    reporterEmail: r.reporter_email,
    pageUrl: r.page_url,
    pageTitle: r.page_title,
    userAgent: r.user_agent,
    viewport: r.viewport,
    screen: r.screen,
    language: r.language,
    timezone: r.timezone,
    referrer: r.referrer,
    contextJson: r.context_json,
    adminNotes: r.admin_notes ?? "",
    hoursEstimated:
      r.hours_estimated == null ? null : Number(r.hours_estimated),
    hoursActual: r.hours_actual == null ? null : Number(r.hours_actual),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export type SubmitBugInput = {
  siteId: string;
  type: BugReport["type"];
  severity: Severity;
  title: string;
  description: string;
  steps?: string;
  expected?: string;
  actual?: string;
  reporterName?: string;
  reporterEmail?: string;
  pageUrl?: string;
  pageTitle?: string;
  userAgent?: string;
  viewport?: string;
  screen?: string;
  language?: string;
  timezone?: string;
  referrer?: string;
  contextJson?: string;
};

export const submitBug = createServerFn({ method: "POST" })
  .validator((data: SubmitBugInput) => {
    return normalizeSubmitBody(data as unknown as Record<string, unknown>);
  })
  .handler(async ({ data }) => {
    let session: { id: string; email: string | null } | null = null;
    try {
      session = await getSessionUser();
    } catch {
      session = null;
    }
    const isMember = Boolean(session?.id) || Boolean(data.isMember);
    const userId = session?.id ?? data.userId ?? null;
    const reporterName =
      data.reporterName ||
      (isMember ? session?.email?.split("@")[0] || "Member" : "Guest");
    const reporterEmail = data.reporterEmail || session?.email || null;

    return createBugReport({
      ...data,
      isMember,
      userId,
      reporterName,
      reporterEmail,
    });
  });

function buildWhere(filters: BugFilters) {
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];
  let i = 1;

  if (filters.siteId && filters.siteId !== "all") {
    clauses.push(`site_id = $${i++}`);
    params.push(filters.siteId);
  }
  if (filters.isMember === true) {
    clauses.push(`is_member = true`);
  } else if (filters.isMember === false) {
    clauses.push(`is_member = false`);
  }
  if (filters.status && filters.status !== "all") {
    clauses.push(`status = $${i++}`);
    params.push(filters.status);
  }
  if (filters.type && filters.type !== "all") {
    clauses.push(`type = $${i++}`);
    params.push(filters.type);
  }
  if (filters.severity && filters.severity !== "all") {
    clauses.push(`severity = $${i++}`);
    params.push(filters.severity);
  }
  if (filters.q && filters.q.trim()) {
    clauses.push(
      `(title ilike $${i} or description ilike $${i} or coalesce(reporter_name,'') ilike $${i} or coalesce(page_url,'') ilike $${i})`,
    );
    params.push(`%${filters.q.trim()}%`);
    i += 1;
  }

  return { where: clauses.join(" and "), params, next: i };
}

export const listBugs = createServerFn({ method: "GET" })
  .validator((data?: BugFilters) => data ?? {})
  .handler(async ({ data }) => {
    const filters = data ?? {};
    if (usesMemoryBugStore()) return memoryListBugs(filters);
    try {
      const sql = await getSql();
      const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
      const offset = Math.max(filters.offset ?? 0, 0);
      const { where, params, next } = buildWhere(filters);

      let order = "created_at desc";
      if (filters.sort === "oldest") order = "created_at asc";
      if (filters.sort === "severity")
        order =
          "case severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, created_at desc";

      const countRows = await sql.query<{ count: number }>(
        `select count(*)::int as count from bug_reports where ${where}`,
        params,
      );
      const total = countRows[0]?.count ?? 0;

      const rows = await sql.query<BugRow>(
        `select * from bug_reports where ${where} order by ${order} limit $${next} offset $${next + 1}`,
        [...params, limit, offset],
      );

      return {
        items: rows.map(mapRow),
        total,
        limit,
        offset,
      };
    } catch (err) {
      console.warn(
        "[bugs] listBugs SQL failed — memory store:",
        err instanceof Error ? err.message : err,
      );
      return memoryListBugs(filters);
    }
  });

export const getBug = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    if (usesMemoryBugStore()) return memoryGetBug(id);
    try {
      const sql = await getSql();
      const rows = await sql<BugRow>`select * from bug_reports where id = ${id}`;
      if (!rows[0]) return null;
      return mapRow(rows[0]);
    } catch {
      return memoryGetBug(id);
    }
  });

export type UpdateBugInput = {
  id: string;
  status?: BugStatus;
  severity?: Severity;
  adminNotes?: string;
  hoursEstimated?: number | null;
  hoursActual?: number | null;
};

export const updateBug = createServerFn({ method: "POST" })
  .validator((data: UpdateBugInput) => {
    if (!data.id) throw new Error("Missing id");
    return data;
  })
  .handler(async ({ data }) => {
    if (usesMemoryBugStore()) return memoryUpdateBug(data);
    try {
      const sql = await getSql();
      const existing = await sql<BugRow>`
        select * from bug_reports where id = ${data.id}
      `;
      if (!existing[0]) throw new Error("Not found");

      const status = data.status ?? existing[0].status;
      const severity = data.severity ?? existing[0].severity;
      const adminNotes =
        data.adminNotes !== undefined
          ? data.adminNotes
          : (existing[0].admin_notes ?? "");
      const hoursEstimated =
        data.hoursEstimated !== undefined
          ? data.hoursEstimated
          : existing[0].hours_estimated;
      const hoursActual =
        data.hoursActual !== undefined
          ? data.hoursActual
          : existing[0].hours_actual;

      await sql`
        update bug_reports set
          status = ${status},
          severity = ${severity},
          admin_notes = ${adminNotes},
          hours_estimated = ${hoursEstimated},
          hours_actual = ${hoursActual},
          updated_at = now()
        where id = ${data.id}
      `;

      const rows = await sql<BugRow>`select * from bug_reports where id = ${data.id}`;
      return mapRow(rows[0]);
    } catch (err) {
      if (err instanceof Error && err.message === "Not found") throw err;
      console.warn(
        "[bugs] updateBug SQL failed — memory store:",
        err instanceof Error ? err.message : err,
      );
      return memoryUpdateBug(data);
    }
  });

export const getBugStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<BugStats> => {
    if (usesMemoryBugStore()) return memoryGetStats();
    try {
      const sql = await getSql();
      const totals = await sql<{
        total: number;
        open: number;
        members: number;
        guests: number;
      }>`
        select
          count(*)::int as total,
          count(*) filter (where status not in ('resolved','wont_fix','duplicate'))::int as open,
          count(*) filter (where is_member)::int as members,
          count(*) filter (where not is_member)::int as guests
        from bug_reports
      `;
      const bySite = await sql<{ site_id: string; count: number }>`
        select site_id, count(*)::int as count from bug_reports group by site_id order by count desc
      `;
      const byStatus = await sql<{ status: string; count: number }>`
        select status, count(*)::int as count from bug_reports group by status order by count desc
      `;
      const bySeverity = await sql<{ severity: string; count: number }>`
        select severity, count(*)::int as count from bug_reports group by severity order by count desc
      `;
      return {
        total: totals[0]?.total ?? 0,
        open: totals[0]?.open ?? 0,
        members: totals[0]?.members ?? 0,
        guests: totals[0]?.guests ?? 0,
        bySite: bySite.map((r) => ({ siteId: r.site_id, count: r.count })),
        byStatus: byStatus.map((r) => ({ status: r.status, count: r.count })),
        bySeverity: bySeverity.map((r) => ({
          severity: r.severity,
          count: r.count,
        })),
      };
    } catch (err) {
      console.warn(
        "[bugs] getBugStats SQL failed — memory store:",
        err instanceof Error ? err.message : err,
      );
      return memoryGetStats();
    }
  },
);

export const seedDemoBugs = createServerFn({ method: "POST" }).handler(
  async () => {
    if (usesMemoryBugStore()) {
      if (memoryCount() > 0) return { seeded: false, count: memoryCount() };
      await createBugReport({
        siteId: "onemission",
        type: "bug",
        severity: "high",
        title: "Cmd Cntr Bugs tab showed empty / unclear reports",
        description:
          "Steward could not read submitted bugs from the old FormSubmit + local inbox path. Need durable multi-site desk.",
        steps:
          "1. User files bug via green button\n2. Open Admin · One Mission → Bugs\n3. Details missing",
        isMember: true,
        reporterName: "Steward",
        reporterEmail: "techsupport@intekspace.com",
        pageUrl:
          "https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html",
      });
      await createBugReport({
        siteId: "intekspace",
        type: "feature",
        severity: "medium",
        title: "Guest wants clearer project apply card",
        description:
          "Non-member visitor could not tell how to apply to Intek Space education projects from the landing.",
        isMember: false,
        reporterName: "Guest",
        pageUrl: "https://intekspace.com/",
      });
      return { seeded: true, count: memoryCount() };
    }
    try {
      const sql = await getSql();
      const existing = await sql<{ count: number }>`
        select count(*)::int as count from bug_reports
      `;
      if ((existing[0]?.count ?? 0) > 0)
        return { seeded: false, count: existing[0].count };

      await createBugReport({
        siteId: "onemission",
        type: "bug",
        severity: "high",
        title: "Cmd Cntr Bugs tab showed empty / unclear reports",
        description:
          "Steward could not read submitted bugs from the old FormSubmit + local inbox path. Need durable multi-site desk.",
        steps:
          "1. User files bug via green button\n2. Open Admin · One Mission → Bugs\n3. Details missing",
        isMember: true,
        reporterName: "Steward",
        reporterEmail: "techsupport@intekspace.com",
        pageUrl:
          "https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html",
      });
      await createBugReport({
        siteId: "intekspace",
        type: "feature",
        severity: "medium",
        title: "Guest wants clearer project apply card",
        description:
          "Non-member visitor could not tell how to apply to Intek Space education projects from the landing.",
        isMember: false,
        reporterName: "Guest",
        pageUrl: "https://intekspace.com/",
      });
      const after = await sql<{ count: number }>`
        select count(*)::int as count from bug_reports
      `;
      return { seeded: true, count: after[0]?.count ?? 0 };
    } catch {
      if (memoryCount() > 0) return { seeded: false, count: memoryCount() };
      await createBugReport({
        siteId: "onemission",
        type: "bug",
        severity: "high",
        title: "Cmd Cntr Bugs tab showed empty / unclear reports",
        description:
          "Steward could not read submitted bugs from the old FormSubmit + local inbox path. Need durable multi-site desk.",
        steps:
          "1. User files bug via green button\n2. Open Admin · One Mission → Bugs\n3. Details missing",
        isMember: true,
        reporterName: "Steward",
        reporterEmail: "techsupport@intekspace.com",
        pageUrl:
          "https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html",
      });
      await createBugReport({
        siteId: "intekspace",
        type: "feature",
        severity: "medium",
        title: "Guest wants clearer project apply card",
        description:
          "Non-member visitor could not tell how to apply to Intek Space education projects from the landing.",
        isMember: false,
        reporterName: "Guest",
        pageUrl: "https://intekspace.com/",
      });
      return { seeded: true, count: memoryCount() };
    }
  },
);
