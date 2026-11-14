import React, { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = {
  label?: string;
  name: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const Input = ({
  label,
  name,
  hint,
  error,
  className,
  ...props
}: InputProps): React.ReactElement => {
  return (
    <div className="fd-field">
      {label && (
        <label className="fd-label" htmlFor={name}>
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn("fd-input", error && "border-error", className)}
        {...props}
      />
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : (
        hint && <span className="text-xs text-text-3">{hint}</span>
      )}
    </div>
  );
};

export default Input;
