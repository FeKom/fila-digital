import { cnJoin } from "@/utils/cnjoin";

type Variant = "dash" | "outline" | "soft";
type Intent =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

type Button = {
  children: React.ReactNode;
  variant?: Variant;
  intent: Intent;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const button = ({
  children,
  intent = "primary",
  variant,
  className,
  ...props
}: Button) => {
  const intents = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    info: "btn-info",
    success: "btn-success",
    warning: "btn-warning",
    error: "btn-error",
  } as Record<Button["intent"], string>;

  const variants = {
    soft: "btn-soft",
    outline: "btn-outline",
    dash: "btn-dash",
  } as Record<Variant, string>;

  return (
    <button
      className={cnJoin(
        "btn",
        "rounded-field",
        intents[intent],
        variant && variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default button;
