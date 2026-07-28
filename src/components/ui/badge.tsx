import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-muted)]",
        member:
          "border-[var(--color-member)]/30 bg-[var(--color-member)]/10 text-[var(--color-member)]",
        guest:
          "border-[var(--color-guest)]/25 bg-[var(--color-guest)]/10 text-[var(--color-guest)]",
        critical:
          "border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
        high: "border-orange-400/40 bg-orange-400/10 text-orange-300",
        medium:
          "border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]",
        low: "border-[var(--color-border-strong)] bg-[var(--color-elevated)] text-[var(--color-muted)]",
        success:
          "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
        info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-[var(--color-info)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
