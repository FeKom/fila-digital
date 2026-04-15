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
        className={`fd-select${className ? ` ${className}` : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
