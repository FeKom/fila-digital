import { cnJoin } from "@/utils/cnjoin";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  name: string;
  label?: string;
  options: SelectOption[];
  defaultValue?: string;
  className?: string;
};

const Select = ({
  name,
  label,
  options,
  defaultValue,
  className,
}: SelectProps) => {
  const select = (
    <select
      name={name}
      defaultValue={defaultValue}
      className={cnJoin("select", className)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <label className="select">
      <span className="label">{label}</span>
      {select}
    </label>
  );
};

export default Select;
