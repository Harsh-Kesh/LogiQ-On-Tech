'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Warehouse, Boxes, ClipboardList } from 'lucide-react';

const TABS = [
  { href: '/dashboard/warehouse', label: 'Facility Overview', icon: Warehouse },
  { href: '/dashboard/owner/inventory', label: 'Stock Control Desk', icon: Boxes },
  { href: '/dashboard/warehouse/dispatch-notes', label: 'Dispatch Notes', icon: ClipboardList },
];

// Shared sub-nav for the Vendor's Warehouse Operations suite. Rendered on all three
// pages so the tab labels and active state can never drift out of sync between them.
export default function WarehouseOpsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm space-x-2 font-sans overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800'
            }`}
          >
            <Icon className="w-4 h-4" /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
