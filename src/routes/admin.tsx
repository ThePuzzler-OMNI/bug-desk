import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin-dashboard";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  return <AdminDashboard />;
}
