'use client';

import React, { useState } from 'react';

export function ItemPicker({
  items,
  value,
  onChange,
  className = '',
  placeholder = 'Search item code or description...',
}: {
  items: any[];
  value: { itemCode: string; itemName: string };
  onChange: (v: { itemCode: string; itemName: string; sellingPrice?: number; unitCost?: number; moq?: number }) => void;
  className?: string;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  
  const filtered = items
    .filter((it) => {
      const q = search.toLowerCase();
      return (
        (it.sku || it.itemCode || '').toLowerCase().includes(q) ||
        (it.name || it.itemName || '').toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q)
      );
    })
    .slice(0, 12);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 placeholder:text-slate-400 font-mono"
        placeholder={placeholder}
        value={value.itemCode ? `${value.itemCode} - ${value.itemName}` : search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
          if (value.itemCode) onChange({ itemCode: '', itemName: '' });
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && search && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100" onMouseDown={(e) => e.preventDefault()}>
          {filtered.map((it) => (
            <button
              key={it.id || it.sku || it.itemCode}
              type="button"
              className="w-full px-3 py-2.5 text-left text-xs hover:bg-indigo-50/80 flex flex-col gap-0.5 transition-colors"
              onClick={() => {
                onChange({
                  itemCode: it.sku || it.itemCode || '',
                  itemName: it.name || it.itemName || it.description || '',
                  sellingPrice: it.sellingPrice || it.price || 0,
                  unitCost: it.purchasePrice || it.cost || 0,
                  moq: it.moq || 1
                });
                setSearch('');
                setOpen(false);
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-indigo-700">{it.sku || it.itemCode}</span>
                <span className="font-mono text-indigo-700 font-bold">${(it.sellingPrice || it.price || 0).toFixed(2)}</span>
              </div>
              <span className="text-slate-600 text-[11px] truncate">{it.name || it.itemName || it.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
