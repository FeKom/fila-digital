import React, { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  name: string;
  label?: string;
  options: SelectOption[];
  defaultValue?: string;
  hint?: string;
  error?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "defaultValue">;

const Select = ({
  name,
  label,
  options,
  defaultValue,
  hint,
  error,
  className,
  ...props
}: SelectProps): React.ReactElement => {
  return (
    <div className="fd-field">
      {label && (
        <label className="fd-label" htmlFor={name}>
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className={cn("fd-select", error && "border-error", className)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : (
        hint && <span className="text-xs text-text-3">{hint}</span>
      )}
    </div>
  );
};

export default Select;
