import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Members are tagged on new reports. Stewards use the same account for
            the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() =>
                  void signIn(p.providerId, { callbackURL: "/admin" })
                }
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Sign-in is disabled in this environment.
            </p>
          )}
          <Link
            to="/report"
            search={{}}
            className="block pt-2 text-center text-sm text-[var(--color-muted)] underline-offset-4 hover:underline"
          >
            Continue as guest and file a report
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
