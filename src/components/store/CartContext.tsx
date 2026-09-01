'use client';

// FR-STORE — guest shopping cart. There's no customer account/session on the public
// site, so the cart lives entirely client-side (localStorage) — it's per-browser, not
// synced anywhere, and is cleared once an order is successfully placed.

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export interface CartLine {
  sku: string;
  itemName: string;
  sellingPrice: number;
  currency: string;
  image?: string;
  categorySlug: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (item: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
  totalCount: number;
  totalValue: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'logiqon_store_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, hydrated]);

  const addItem = useCallback((item: Omit<CartLine, 'quantity'>, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.sku === item.sku);
      if (existing) {
        return prev.map((l) => (l.sku === item.sku ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((sku: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.sku !== sku);
      return prev.map((l) => (l.sku === sku ? { ...l, quantity } : l));
    });
  }, []);

  const removeItem = useCallback((sku: string) => {
    setLines((prev) => prev.filter((l) => l.sku !== sku));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const totalValue = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.sellingPrice, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, addItem, updateQuantity, removeItem, clear, totalCount, totalValue }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
