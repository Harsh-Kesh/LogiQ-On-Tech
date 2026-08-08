import React from 'react';

export type BadgeVariant = 'purple' | 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' | 'success' | 'danger' | 'warning' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'indigo', size = 'sm', className = '' }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
    md: 'px-3 py-1 text-xs font-bold uppercase tracking-wider',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
