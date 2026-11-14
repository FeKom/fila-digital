import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("fd-badge", {
  variants: {
    variant: {
      primary: "fd-badge-primary",
      secondary: "fd-badge-primary",
      info: "fd-badge-primary",
      success: "fd-badge-success",
      error: "fd-badge-error",
      warning: "fd-badge-warning",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export type BadgeProps = {
  children: React.ReactNode;
  className?: string;
} & VariantProps<typeof badgeVariants>;

const Badge = ({
  children,
  variant = "primary",
  className,
}: BadgeProps): React.ReactElement => {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {children}
    </span>
  );
};

export default Badge;
