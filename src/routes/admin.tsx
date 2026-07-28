import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin-dashboard";

type AdminSearch = {
  site?: string;
  member?: string;
};

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  validateSearch: (search: Record<string, unknown>): AdminSearch => ({
    site: typeof search.site === "string" ? search.site : undefined,
    member: typeof search.member === "string" ? search.member : undefined,
  }),
});

function AdminPage() {
  const { site, member } = Route.useSearch();
  const isMember =
    member === "1" || member === "true" || member === "yes"
      ? true
      : member === "0" || member === "false" || member === "no"
        ? false
        : null;
  return (
    <AdminDashboard
      initialSiteId={site}
      initialIsMember={isMember}
    />
  );
}
