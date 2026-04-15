import { cnJoin } from "@/utils/cnjoin";

type ButtonIntent = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: React.ReactNode;
  intent?: ButtonIntent | "accent" | "info" | "success" | "warning" | "error";
  size?: ButtonSize;
  variant?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = ({
  children,
  intent = "primary",
  size,
  className,
  variant: _variant,
  ...props
}: ButtonProps) => {
  const intentMap: Record<string, string> = {
    primary: "fd-btn-primary",
    secondary: "fd-btn-secondary",
    ghost: "fd-btn-ghost",
    danger: "fd-btn-danger",
    error: "fd-btn-danger",
    accent: "fd-btn-ghost",
    info: "fd-btn-ghost",
    success: "fd-btn-ghost",
    warning: "fd-btn-ghost",
  };

  const sizeMap: Record<string, string> = {
    sm: "fd-btn-sm",
    md: "",
    lg: "fd-btn-lg",
  };

  return (
    <button
      className={cnJoin(
        "fd-btn",
        intentMap[intent] ?? "fd-btn-primary",
        size && sizeMap[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
