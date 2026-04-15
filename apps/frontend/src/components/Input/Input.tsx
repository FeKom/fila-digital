import React, { InputHTMLAttributes } from "react";

type InputProps = {
  label?: string;
  name: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const Input = ({ label, name, hint, ...props }: InputProps) => {
  return (
    <div className="fd-field">
      {label && (
        <label className="fd-label" htmlFor={name}>
          {label}
        </label>
      )}
      <input id={name} name={name} className="fd-input" {...props} />
      {hint && (
        <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
          {hint}
        </span>
      )}
    </div>
  );
};

export default Input;
