import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Filter,
  Globe2,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Multi-site · durable · reviewable
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          One desk for every bug across every site
        </h1>
        <p className="mt-4 text-base text-[var(--color-muted)] sm:text-lg">
          Context-rich reports from members and guests land in a single steward
          dashboard you can sort, filter, and triage — no more opaque emails or
          browser-local inboxes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/report" search={{}}>
            <Button size="lg">
              File a report <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/admin">
            <Button size="lg" variant="secondary">
              Open dashboard
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Globe2,
            title: "All sites",
            body: "One Mission, Intek Space, IMI, and others in one queue.",
          },
          {
            icon: ShieldCheck,
            title: "Member vs guest",
            body: "Signed-in reports tagged as members; guests stay anonymous-capable.",
          },
          {
            icon: Layers,
            title: "Rich context",
            body: "URL, viewport, UA, timezone, steps, expected vs actual — auto-captured.",
          },
          {
            icon: Filter,
            title: "Steward filters",
            body: "Sort by severity, status, site, membership, and free-text search.",
          },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="space-y-3 p-5">
              <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                <f.icon className="h-4 w-4 text-[var(--color-muted)]" />
              </span>
              <h2 className="font-semibold tracking-tight">{f.title}</h2>
              <p className="text-sm text-[var(--color-muted)]">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-14 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">
              <Zap className="h-3.5 w-3.5" /> Built to scale
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Postgres-backed, indexed, multi-tenant ready
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Reports persist in a real database (PGLite in preview, Neon in
              production). Filters hit indexes on site, membership, status,
              severity, and time — not a JSON file or email thread.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/report" search={{}}>
              <Button>Report as guest or member</Button>
            </Link>
            <Link to="/admin">
              <Button variant="outline">Review inbox</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
