export const SITES = [
  { id: "onemission", name: "One Mission Network" },
  { id: "intekspace", name: "Intek Space" },
  { id: "imi", name: "Institute of Mature Imagination" },
  { id: "other", name: "Other / Unknown" },
] as const;

export type SiteId = (typeof SITES)[number]["id"];

export const BUG_TYPES = ["bug", "feature", "other"] as const;
export type BugType = (typeof BUG_TYPES)[number];

export const BUG_STATUSES = [
  "new",
  "triaged",
  "in_progress",
  "resolved",
  "wont_fix",
  "duplicate",
] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type BugContext = {
  pageUrl?: string;
  pageTitle?: string;
  userAgent?: string;
  viewport?: string;
  screen?: string;
  language?: string;
  timezone?: string;
  referrer?: string;
};

export type BugReport = {
  id: string;
  siteId: SiteId | string;
  type: BugType;
  status: BugStatus;
  severity: Severity;
  title: string;
  description: string;
  steps: string | null;
  expected: string | null;
  actual: string | null;
  isMember: boolean;
  userId: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  userAgent: string | null;
  viewport: string | null;
  screen: string | null;
  language: string | null;
  timezone: string | null;
  referrer: string | null;
  contextJson: string | null;
  adminNotes: string;
  hoursEstimated: number | null;
  hoursActual: number | null;
  createdAt: string;
  updatedAt: string;
};

export type BugFilters = {
  siteId?: string;
  isMember?: boolean | null;
  status?: string;
  type?: string;
  severity?: string;
  q?: string;
  sort?: "newest" | "oldest" | "severity";
  limit?: number;
  offset?: number;
};

export type BugStats = {
  total: number;
  open: number;
  members: number;
  guests: number;
  bySite: { siteId: string; count: number }[];
  byStatus: { status: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
};

export const STATUS_LABELS: Record<BugStatus, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
  duplicate: "Duplicate",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const TYPE_LABELS: Record<BugType, string> = {
  bug: "Bug",
  feature: "Feature",
  other: "Other",
};
