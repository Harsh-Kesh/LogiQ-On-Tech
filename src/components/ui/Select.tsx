import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full px-4 py-2.5 rounded-xl bg-white border text-slate-900 text-xs font-medium transition-all focus:outline-none appearance-none ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
