import { forwardRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select({
  label,
  error,
  required = false,
  options = [],
  placeholder,
  className = '',
  containerClassName = '',
  id,
  value,
  onFocus,
  onBlur,
  children,
  ...rest
}, ref) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== '';
  const floated = focused || hasValue;
  const inputId = id || rest.name;

  return (
    <div className={containerClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          value={value}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          className={[
            'peer w-full appearance-none border rounded-lg px-3 pt-4 pb-1.5 pr-9 text-sm text-slate-900 dark:text-slate-100',
            'bg-white dark:bg-slate-900 outline-none transition-colors cursor-pointer',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50',
            error
              ? 'border-red-300 focus:ring-2 focus:ring-red-400'
              : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            className,
          ].filter(Boolean).join(' ')}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.length
            ? options.map((opt) => {
                const v = typeof opt === 'object' ? opt.value : opt;
                const l = typeof opt === 'object' ? opt.label : opt;
                return <option key={v} value={v}>{l}</option>;
              })
            : children}
        </select>
        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none peer-focus:text-blue-500" />
        {label && (
          <label
            htmlFor={inputId}
            className={[
              'absolute left-3 pointer-events-none transition-all duration-150 select-none',
              floated ? 'top-1.5 text-[11px]' : 'top-1/2 -translate-y-1/2 text-sm',
              focused ? 'text-blue-600' : 'text-slate-400',
            ].join(' ')}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Select;
