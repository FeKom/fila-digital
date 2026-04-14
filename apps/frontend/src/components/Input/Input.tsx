import { cnJoin } from "@/utils/cnjoin";
import React, { InputHTMLAttributes } from "react";

type Input = {
  label?: string;
  type?: string;
  placeholder?: string;
  id?: string;
  name: string;
  onChange?: React.ChangeEventHandler;
} & InputHTMLAttributes<HTMLElement>;

const input = ({
  type = "text",
  placeholder,
  id,
  name,
  onChange,
  label,
  className,
}: Input) => {
  const RawInput = () => {
    return (
      <input
        type={type}
        placeholder={placeholder}
        id={id}
        name={name}
        className={cnJoin(!label && "input", className)}
      />
    );
  };
  if (!label) return <RawInput />;

  return (
    <>
      <label className="input">
        <span className="label">{label}</span>
        <RawInput />
      </label>
    </>
  );
};

export default input;
