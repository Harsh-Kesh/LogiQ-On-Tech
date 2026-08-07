'use client';

import React, { useState } from 'react';
import { CategoryItem } from '@/lib/categories';
import { ChevronRight, ChevronDown, Folder, Tag } from 'lucide-react';

interface CategoryTreeProps {
  categories: CategoryItem[];
  selectedCategoryId?: string;
  onSelectCategory?: (category: CategoryItem) => void;
}

export function CategoryTree({ categories, selectedCategoryId, onSelectCategory }: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    cat_hw: true,
    cat_prt: true,
    cat_rfid: true,
    cat_wh: true,
  });

  const topLevel = categories.filter((c) => !c.parentId);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-1 font-sans text-xs">
      {topLevel.map((parent) => {
        const children = categories.filter((c) => c.parentId === parent.id);
        const hasChildren = children.length > 0;
        const isExpanded = !!expanded[parent.id];
        const isSelected = selectedCategoryId === parent.id;

        return (
          <div key={parent.id} className="rounded-xl overflow-hidden border border-slate-100 bg-white">
            <div
              onClick={() => onSelectCategory && onSelectCategory(parent)}
              className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                isSelected ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600' : 'hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(parent.id, e)}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-500"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <Folder className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold">{parent.name}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                {children.length > 0 ? `${children.length} Sub` : 'Category'}
              </span>
            </div>

            {hasChildren && isExpanded && (
              <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-50/50 border-t border-slate-100">
                {children.map((child) => {
                  const isChildSelected = selectedCategoryId === child.id;
                  return (
                    <div
                      key={child.id}
                      onClick={() => onSelectCategory && onSelectCategory(child)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChildSelected
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'hover:bg-slate-200/60 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className={`w-3.5 h-3.5 ${isChildSelected ? 'text-white' : 'text-indigo-600'}`} />
                        <span>{child.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${isChildSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {child.slug}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
