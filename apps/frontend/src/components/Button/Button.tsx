import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "fd-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      intent: {
        primary: "fd-btn-primary",
        secondary: "fd-btn-secondary",
        ghost: "fd-btn-ghost",
        danger: "fd-btn-danger",
        error: "fd-btn-danger",
        accent: "fd-btn-ghost",
        info: "fd-btn-ghost",
        success: "fd-btn-ghost",
        warning: "fd-btn-ghost",
      },
      size: {
        sm: "fd-btn-sm",
        md: "",
        lg: "fd-btn-lg",
      },
    },
    defaultVariants: {
      intent: "primary",
    },
  }
);

export type ButtonProps = {
  children: React.ReactNode;
  variant?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = ({
  children,
  intent = "primary",
  size,
  className,
  variant: _variant,
  ...props
}: ButtonProps): React.ReactElement => {
  return (
    <button
      className={cn(buttonVariants({ intent, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
