import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border bg-surface-elevated",
        success: "border-transparent bg-win-ceki text-background",
        info: "border-transparent bg-secondary text-secondary-foreground",
        neutral: "text-foreground border-border bg-surface-elevated",
        warning: "border-transparent bg-win-biasa text-background",
        biasa: "border-transparent bg-win-biasa text-background",
        kandang: "border-transparent bg-win-kandang text-foreground",
        ceki: "border-transparent bg-win-ceki text-background",
        palang: "border-transparent bg-win-palang text-foreground",
        tangkap: "border-transparent bg-win-tangkap text-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  tone?: "default" | "secondary" | "destructive" | "outline" | "success" | "info" | "neutral" | "warning" | "biasa" | "kandang" | "ceki" | "palang" | "tangkap";
}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  const activeVariant = tone || variant;
  return (
    <div className={cn(badgeVariants({ variant: activeVariant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
