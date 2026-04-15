import { cnJoin } from "@/utils/cnjoin";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "error" | "warning" | "info" | "primary" | "secondary";
  className?: string;
};

const Badge = ({ children, variant = "primary", className }: BadgeProps) => {
  const variantMap: Record<string, string> = {
    success: "fd-badge-success",
    error: "fd-badge-error",
    warning: "fd-badge-warning",
    info: "fd-badge-primary",
    primary: "fd-badge-primary",
    secondary: "fd-badge-primary",
  };

  return (
    <span className={cnJoin("fd-badge", variantMap[variant], className)}>
      {children}
    </span>
  );
};

export default Badge;
