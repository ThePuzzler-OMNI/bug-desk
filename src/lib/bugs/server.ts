import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { uid } from "@/lib/utils";
import type {
  BugFilters,
  BugReport,
  BugStats,
  BugStatus,
  BugType,
  Severity,
  SiteId,
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
    type: r.type as BugType,
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
  type: BugType;
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
    const title = (data.title ?? "").trim();
    const description = (data.description ?? "").trim();
    if (title.length < 3) throw new Error("Title must be at least 3 characters");
    if (description.length < 10)
      throw new Error("Description must be at least 10 characters");
    const siteId = (data.siteId || "other").trim();
    const type = data.type || "bug";
    const severity = data.severity || "medium";
    if (!["bug", "feature", "other"].includes(type))
      throw new Error("Invalid type");
    if (!["low", "medium", "high", "critical"].includes(severity))
      throw new Error("Invalid severity");
    return {
      ...data,
      siteId,
      type: type as BugType,
      severity: severity as Severity,
      title: title.slice(0, 200),
      description: description.slice(0, 8000),
      steps: (data.steps ?? "").trim().slice(0, 4000) || undefined,
      expected: (data.expected ?? "").trim().slice(0, 2000) || undefined,
      actual: (data.actual ?? "").trim().slice(0, 2000) || undefined,
      reporterName: (data.reporterName ?? "").trim().slice(0, 120) || undefined,
      reporterEmail: (data.reporterEmail ?? "").trim().slice(0, 200) || undefined,
    };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    let session: { id: string; email: string | null } | null = null;
    try {
      session = await getSessionUser();
    } catch {
      session = null;
    }
    const isMember = Boolean(session?.id);
    const userId = session?.id ?? null;
    const reporterName =
      data.reporterName ||
      (isMember ? session?.email?.split("@")[0] || "Member" : "Guest");
    const reporterEmail = data.reporterEmail || session?.email || null;
    const id = uid("bug");

    const sites = await sql<{ id: string }>`
      select id from sites where id = ${data.siteId}
    `;
    const siteId = (sites[0]?.id ?? "other") as SiteId;

    await sql`
      insert into bug_reports (
        id, site_id, type, status, severity, title, description,
        steps, expected, actual,
        is_member, user_id, reporter_name, reporter_email,
        page_url, page_title, user_agent, viewport, screen,
        language, timezone, referrer, context_json
      ) values (
        ${id}, ${siteId}, ${data.type}, ${"new"}, ${data.severity},
        ${data.title}, ${data.description},
        ${data.steps ?? null}, ${data.expected ?? null}, ${data.actual ?? null},
        ${isMember}, ${userId}, ${reporterName}, ${reporterEmail},
        ${data.pageUrl ?? null}, ${data.pageTitle ?? null},
        ${data.userAgent ?? null}, ${data.viewport ?? null}, ${data.screen ?? null},
        ${data.language ?? null}, ${data.timezone ?? null},
        ${data.referrer ?? null}, ${data.contextJson ?? null}
      )
    `;

    return { id, isMember };
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
    const sql = await getSql();
    const filters = data ?? {};
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
  });

export const getBug = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sql = await getSql();
    const rows = await sql<BugRow>`select * from bug_reports where id = ${id}`;
    if (!rows[0]) return null;
    return mapRow(rows[0]);
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
        : existing[0].admin_notes;
    const hoursEstimated =
      data.hoursEstimated !== undefined
        ? data.hoursEstimated
        : existing[0].hours_estimated == null
          ? null
          : Number(existing[0].hours_estimated);
    const hoursActual =
      data.hoursActual !== undefined
        ? data.hoursActual
        : existing[0].hours_actual == null
          ? null
          : Number(existing[0].hours_actual);

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
    return mapRow(rows[0]!);
  });

export const getBugStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<BugStats> => {
    const sql = await getSql();
    const totalRows = await sql<{ c: number }>`
      select count(*)::int as c from bug_reports
    `;
    const openRows = await sql<{ c: number }>`
      select count(*)::int as c from bug_reports
      where status not in ('resolved', 'wont_fix', 'duplicate')
    `;
    const memberRows = await sql<{ c: number }>`
      select count(*)::int as c from bug_reports where is_member = true
    `;
    const guestRows = await sql<{ c: number }>`
      select count(*)::int as c from bug_reports where is_member = false
    `;
    const bySite = await sql<{ site_id: string; c: number }>`
      select site_id, count(*)::int as c from bug_reports group by site_id order by c desc
    `;
    const byStatus = await sql<{ status: string; c: number }>`
      select status, count(*)::int as c from bug_reports group by status
    `;
    const bySeverity = await sql<{ severity: string; c: number }>`
      select severity, count(*)::int as c from bug_reports group by severity
    `;

    return {
      total: totalRows[0]?.c ?? 0,
      open: openRows[0]?.c ?? 0,
      members: memberRows[0]?.c ?? 0,
      guests: guestRows[0]?.c ?? 0,
      bySite: bySite.map((r) => ({ siteId: r.site_id, count: r.c })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r.c })),
      bySeverity: bySeverity.map((r) => ({
        severity: r.severity,
        count: r.c,
      })),
    };
  },
);

export const seedDemoBugs = createServerFn({ method: "POST" }).handler(
  async () => {
    const sql = await getSql();
    const existing = await sql<{ c: number }>`
      select count(*)::int as c from bug_reports
    `;
    if ((existing[0]?.c ?? 0) > 0) {
      return { seeded: false, count: existing[0]!.c };
    }

    const samples: Array<{
      site: string;
      type: BugType;
      severity: Severity;
      status: BugStatus;
      title: string;
      description: string;
      isMember: boolean;
      name: string;
      email: string | null;
      page: string;
      steps?: string;
    }> = [
      {
        site: "onemission",
        type: "bug",
        severity: "high",
        status: "new",
        title: "Education Exchange form age band still shown on mobile",
        description:
          "After the age-band to exact-age change, mobile Safari still shows the old age band select on first paint, then swaps to a number input. Looks like a hydration flash.",
        isMember: true,
        name: "Maya Chen",
        email: "maya@example.com",
        page: "https://intekspace.com/education-apply.html",
        steps:
          "1. Open Education apply on iPhone\n2. Select any track\n3. Scroll to age field",
      },
      {
        site: "intekspace",
        type: "feature",
        severity: "medium",
        status: "triaged",
        title: "Project card application needs resume upload",
        description:
          "Applicants for Interspecies Communication Systems want to attach a short resume or portfolio link. A single optional URL field would help triage.",
        isMember: false,
        name: "Guest",
        email: null,
        page: "https://intekspace.com/education.html",
      },
      {
        site: "onemission",
        type: "bug",
        severity: "critical",
        status: "in_progress",
        title: "Bug / idea button email send fails without message body",
        description:
          "FormSubmit succeeds but the steward inbox only shows subject and page URL — description field is empty when reporter uses autofill and leaves details sparse. Need structured required fields.",
        isMember: false,
        name: "Anonymous",
        email: "reporter@mail.com",
        page: "https://onemissionnetworkandinstitute.org/court.html",
      },
      {
        site: "imi",
        type: "bug",
        severity: "low",
        status: "new",
        title: "Spaces archive video poster missing on slow networks",
        description:
          "Poster image never loads when the connection drops mid-fetch. Empty black square remains. Suggest a fallback poster color plus retry.",
        isMember: true,
        name: "Jordan Lee",
        email: "jordan@example.com",
        page: "https://instituteofmatureimagination.org/",
      },
      {
        site: "onemission",
        type: "feature",
        severity: "medium",
        status: "new",
        title: "Unified bug dashboard across all mirror sites",
        description:
          "Steward cannot sort member vs non-member reports from a single view. Need one admin surface for OMNI, Intek, and IMI.",
        isMember: true,
        name: "thePuzzler",
        email: "tharpster@intekflow.com",
        page: "https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html",
      },
      {
        site: "intekspace",
        type: "other",
        severity: "low",
        status: "resolved",
        title: "Footer year still shows 2025 on some pages",
        description: "Static footer year was hard-coded. Fixed in last deploy.",
        isMember: false,
        name: "Visitor",
        email: null,
        page: "https://intekspace.com/",
      },
      {
        site: "onemission",
        type: "bug",
        severity: "high",
        status: "triaged",
        title: "Cmd Cntr Bugs tab local inbox empty after FormSubmit",
        description:
          "Reports arrive by email but never appear in Admin Bugs local inbox. localStorage is device-bound; no durable cross-device inbox.",
        isMember: true,
        name: "Steward device B",
        email: "steward@onemission.network",
        page: "https://onemissionnetworkandinstitute.org/MasterPuzzlerCmdCntr.html",
      },
      {
        site: "other",
        type: "bug",
        severity: "medium",
        status: "new",
        title: "Embed widget CORS block when loaded from third-party origin",
        description:
          "Embedding the green report button on a partner domain fails preflight. Need a public POST endpoint with CORS for partner sites.",
        isMember: false,
        name: "Partner dev",
        email: "dev@partner.org",
        page: "https://partner.example/demo",
      },
    ];

    for (const s of samples) {
      const id = uid("seed");
      await sql`
        insert into bug_reports (
          id, site_id, type, status, severity, title, description, steps,
          is_member, reporter_name, reporter_email, page_url, page_title,
          user_agent, viewport, language, timezone
        ) values (
          ${id}, ${s.site}, ${s.type}, ${s.status}, ${s.severity},
          ${s.title}, ${s.description}, ${s.steps ?? null},
          ${s.isMember}, ${s.name}, ${s.email},
          ${s.page}, ${"Demo page"},
          ${"Mozilla/5.0 (demo) AppleWebKit/537.36"},
          ${"1440x900"}, ${"en-US"}, ${"America/New_York"}
        )
      `;
    }

    return { seeded: true, count: samples.length };
  },
);
