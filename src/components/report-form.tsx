import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Shield, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { captureClientContext } from "@/lib/bugs/capture-context";
import { submitBug } from "@/lib/bugs/server";
import {
  SEVERITIES,
  SITES,
  TYPE_LABELS,
  type BugType,
  type Severity,
} from "@/lib/bugs/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input, Label, Textarea } from "./ui/input";
import { Select } from "./ui/select";
import { Badge } from "./ui/badge";

export function ReportForm({ defaultSite }: { defaultSite?: string }) {
  const { user, isPending } = useCurrentUserState();
  const [ctx, setCtx] = useState({
    pageUrl: "",
    pageTitle: "",
    userAgent: "",
    viewport: "",
    screen: "",
    language: "",
    timezone: "",
    referrer: "",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCtx(captureClientContext() as typeof ctx);
    setPageUrl((prev) => prev || window.location.href);
  }, []);

  const [siteId, setSiteId] = useState(defaultSite || "onemission");
  const [type, setType] = useState<BugType>("bug");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [doneMember, setDoneMember] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const live = captureClientContext({ pageUrl: pageUrl || undefined });
      const result = await submitBug({
        data: {
          siteId,
          type,
          severity,
          title,
          description,
          steps: steps || undefined,
          expected: expected || undefined,
          actual: actual || undefined,
          reporterName: user?.displayName || name || undefined,
          reporterEmail: user?.primaryEmail || email || undefined,
          pageUrl: live.pageUrl,
          pageTitle: live.pageTitle,
          userAgent: live.userAgent,
          viewport: live.viewport,
          screen: live.screen,
          language: live.language,
          timezone: live.timezone,
          referrer: live.referrer,
          contextJson: JSON.stringify({
            capturedAt: new Date().toISOString(),
            signedIn: Boolean(user),
          }),
        },
      });
      setDoneId(result.id);
      setDoneMember(result.isMember);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)]/15">
            <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
          </div>
          <CardTitle>Report received</CardTitle>
          <CardDescription>
            ID <span className="font-mono text-[var(--color-fg)]">{doneId}</span>
            {doneMember ? " · tagged as member" : " · tagged as guest"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setDoneId(null);
              setTitle("");
              setDescription("");
              setSteps("");
              setExpected("");
              setActual("");
            }}
          >
            Submit another
          </Button>
          <Link to="/admin">
            <Button variant="secondary">Open dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const showIdentity = mounted && !isPending;

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Context-rich report</CardTitle>
              <CardDescription>
                Works for signed-in members and guests. Context is captured
                automatically for triage.
              </CardDescription>
            </div>
            <div className="h-6 min-w-[5.5rem]">
              {showIdentity ? (
                <Badge variant={user ? "member" : "guest"}>
                  {user ? (
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Member
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" /> Guest
                    </span>
                  )}
                </Badge>
              ) : (
                <span className="inline-block h-5 w-16 animate-pulse rounded-full bg-[var(--color-elevated)]" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="site">Site</Label>
              <Select
                id="site"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as BugType)}
              >
                {(Object.keys(TYPE_LABELS) as BugType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="severity">Severity</Label>
              <Select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              maxLength={200}
              placeholder="Short summary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Details</Label>
            <Textarea
              id="description"
              required
              maxLength={8000}
              placeholder="What happened? What did you expect?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="steps">Steps to reproduce (optional)</Label>
            <Textarea
              id="steps"
              maxLength={4000}
              placeholder="1. …&#10;2. …"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="expected">Expected</Label>
              <Textarea
                id="expected"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                placeholder="What should happen"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="actual">Actual</Label>
              <Textarea
                id="actual"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="What actually happened"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pageUrl">Page URL</Label>
            <Input
              id="pageUrl"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          {showIdentity && !user && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How we refer to you"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Follow-up contact"
                />
              </div>
            </div>
          )}

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-subtle)]">
            <p className="mb-1 font-medium text-[var(--color-muted)]">
              Auto-captured context
            </p>
            <ul className="grid gap-0.5 font-mono sm:grid-cols-2">
              <li>viewport: {ctx.viewport || "—"}</li>
              <li>tz: {ctx.timezone || "—"}</li>
              <li className="truncate sm:col-span-2">
                ua: {(ctx.userAgent || "—").slice(0, 80)}
              </li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy} className="min-w-[140px]">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending
                </>
              ) : (
                "Submit report"
              )}
            </Button>
            {showIdentity && !user && (
              <Link to="/login">
                <Button type="button" variant="ghost">
                  Sign in to tag as member
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
