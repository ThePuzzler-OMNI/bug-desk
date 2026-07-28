import { getSql, usesMemoryBugStore } from "@/lib/db";
import { uid } from "@/lib/utils";
import { memoryCreateBug } from "./memory-store";
import type { BugType, Severity, SiteId } from "./types";

export type CreateBugInput = {
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

export type CreateBugResult = {
  id: string;
  isMember: boolean;
  siteId: string;
};

async function createBugReportSql(
  data: CreateBugInput,
): Promise<CreateBugResult> {
  const sql = await getSql();
  const id = uid("bug");
  const isMember = Boolean(data.isMember);
  const sites = await sql<{ id: string }>`
    select id from sites where id = ${data.siteId}
  `;
  const siteId = (sites[0]?.id ?? "other") as SiteId;
  const reporterName =
    (data.reporterName && data.reporterName.trim()) ||
    (isMember ? "Member" : "Guest");

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
      ${isMember}, ${data.userId ?? null}, ${reporterName}, ${data.reporterEmail ?? null},
      ${data.pageUrl ?? null}, ${data.pageTitle ?? null},
      ${data.userAgent ?? null}, ${data.viewport ?? null}, ${data.screen ?? null},
      ${data.language ?? null}, ${data.timezone ?? null},
      ${data.referrer ?? null}, ${data.contextJson ?? null}
    )
  `;

  return { id, isMember, siteId };
}

export async function createBugReport(
  data: CreateBugInput,
): Promise<CreateBugResult> {
  if (usesMemoryBugStore()) {
    return memoryCreateBug(data);
  }
  try {
    return await createBugReportSql(data);
  } catch (err) {
    console.warn(
      "[bugs] SQL create failed — using memory store:",
      err instanceof Error ? err.message : err,
    );
    return memoryCreateBug(data);
  }
}

export function normalizeSubmitBody(raw: Record<string, unknown>): CreateBugInput {
  const title = String(raw.title ?? "").trim();
  const description = String(raw.description ?? "").trim();
  if (title.length < 3) throw new Error("Title must be at least 3 characters");
  if (description.length < 10)
    throw new Error("Description must be at least 10 characters");

  const type = String(raw.type || "bug");
  const severity = String(raw.severity || "medium");
  if (!["bug", "feature", "other"].includes(type))
    throw new Error("Invalid type");
  if (!["low", "medium", "high", "critical"].includes(severity))
    throw new Error("Invalid severity");

  const siteId = String(raw.siteId || raw.site || "other").trim() || "other";

  return {
    siteId,
    type: type as BugType,
    severity: severity as Severity,
    title: title.slice(0, 200),
    description: description.slice(0, 8000),
    steps: String(raw.steps ?? "").trim().slice(0, 4000) || null,
    expected: String(raw.expected ?? "").trim().slice(0, 2000) || null,
    actual: String(raw.actual ?? "").trim().slice(0, 2000) || null,
    isMember: Boolean(raw.isMember ?? raw.member),
    userId: raw.userId ? String(raw.userId).slice(0, 200) : null,
    reporterName: String(raw.reporterName ?? "").trim().slice(0, 120) || null,
    reporterEmail: String(raw.reporterEmail ?? "").trim().slice(0, 200) || null,
    pageUrl: String(raw.pageUrl ?? "").trim().slice(0, 2000) || null,
    pageTitle: String(raw.pageTitle ?? "").trim().slice(0, 500) || null,
    userAgent: String(raw.userAgent ?? "").trim().slice(0, 1000) || null,
    viewport: String(raw.viewport ?? "").trim().slice(0, 64) || null,
    screen: String(raw.screen ?? "").trim().slice(0, 64) || null,
    language: String(raw.language ?? "").trim().slice(0, 32) || null,
    timezone: String(raw.timezone ?? "").trim().slice(0, 64) || null,
    referrer: String(raw.referrer ?? "").trim().slice(0, 2000) || null,
    contextJson:
      typeof raw.contextJson === "string"
        ? raw.contextJson.slice(0, 12000)
        : raw.context
          ? JSON.stringify(raw.context).slice(0, 12000)
          : null,
  };
}
