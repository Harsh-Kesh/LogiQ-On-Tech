import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, type = 'text', className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={currentType}
            className={`w-full px-4 py-2.5 rounded-xl bg-white border text-slate-900 text-xs font-medium transition-all focus:outline-none placeholder:text-slate-400 ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon || isPassword ? 'pr-10' : ''} ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20'
            } ${className}`}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-slate-400 hover:text-slate-700 flex items-center transition-colors cursor-pointer p-1"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3.5 text-slate-400 flex items-center">
                {rightIcon}
              </div>
            )
          )}
        </div>
        {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
