import { createFileRoute } from "@tanstack/react-router";
import { createBugReport, normalizeSubmitBody } from "@/lib/bugs/create";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS,
    },
  });
}

export const Route = createFileRoute("/api/bugs")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: CORS,
        }),
      GET: async () => {
        // Lightweight health for agents / Cmd Cntr — never touch PGLite
        const { getDbSource, usesMemoryBugStore } = await import("@/lib/db");
        return json({
          ok: true,
          health: "up",
          dbSource: getDbSource(),
          memoryStore: usesMemoryBugStore(),
          post: "POST /api/bugs with JSON body",
          note:
            getDbSource() === "memory"
              ? "No DATABASE_URL — bugs use in-process memory (warm instance only). Set Neon DATABASE_URL for durable multi-instance."
              : getDbSource() === "neon"
                ? "Neon DATABASE_URL active"
                : "Local PGLite",
        });
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Record<string, unknown>;
          const input = normalizeSubmitBody(body);
          const result = await createBugReport(input);
          const { getDbSource } = await import("@/lib/db");
          return json({
            ok: true,
            id: result.id,
            isMember: result.isMember,
            siteId: result.siteId,
            dbSource: getDbSource(),
            durable: getDbSource() === "neon",
            dashboardUrl: `https://bug-desk.vercel.app/admin`,
            reportUrl: `https://bug-desk.vercel.app/report?site=${encodeURIComponent(result.siteId)}`,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Submit failed";
          // Never return raw PGLite ENOENT as the only story — fall back already in create
          const status =
            msg.includes("at least") || msg.includes("Invalid") ? 400 : 500;
          return json({ ok: false, error: msg }, status);
        }
      },
    },
  },
});
