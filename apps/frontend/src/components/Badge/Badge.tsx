import { cnJoin } from "@/utils/cnjoin";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "error" | "warning" | "info" | "primary" | "secondary";
  className?: string;
};

const Badge = ({ children, variant = "primary", className }: BadgeProps) => {
  const variants = {
    success: "badge-success",
    error: "badge-error",
    warning: "badge-warning",
    info: "badge-info",
    primary: "badge-primary",
    secondary: "badge-secondary",
  };

  return (
    <span className={cnJoin("badge", variants[variant], className)}>
      {children}
    </span>
  );
};

export default Badge;
