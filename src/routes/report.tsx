import { createFileRoute } from "@tanstack/react-router";
import { ReportForm } from "@/components/report-form";

type ReportSearch = {
  site?: string;
};

export const Route = createFileRoute("/report")({
  component: ReportPage,
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    site: typeof search.site === "string" ? search.site : undefined,
  }),
});

function ReportPage() {
  const { site } = Route.useSearch();
  return (
    <div className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto mb-8 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Report a bug or idea
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          No account required. Sign in if you want the report tagged as a
          member for faster triage.
        </p>
      </div>
      <ReportForm defaultSite={site} />
    </div>
  );
}
