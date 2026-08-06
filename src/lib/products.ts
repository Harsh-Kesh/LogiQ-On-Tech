import fs from 'fs';
import path from 'path';

export interface PersistentProduct {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  vendorId: string;
  vendorEmail: string;
  createdAt: string;
  updatedAt: string;
}

const PRODUCTS_FILE = path.join(process.cwd(), '.data', 'vendor_products.json');

function ensureDirExists() {
  const dir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadPersistentProducts(): Record<string, PersistentProduct> {
  ensureDirExists();
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return getSeedDemoProducts();
}

export function savePersistentProducts(products: Record<string, PersistentProduct>) {
  ensureDirExists();
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {}
}

function getSeedDemoProducts(): Record<string, PersistentProduct> {
  return {
    'item_01': {
      id: 'item_01',
      sku: 'SKU-APX-1001',
      barcode: '9312345000018',
      itemName: 'Industrial Handheld Barcode Scanner 2D',
      description: 'Heavy-duty IP65 rated Bluetooth 2D barcode scanner for warehouse receiving.',
      costPrice: 120.00,
      sellingPrice: 249.99,
      status: 'ACTIVE',
      vendorId: 'vnd_usr_vendor_01',
      vendorEmail: 'vendor@logiqon.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'item_02': {
      id: 'item_02',
      sku: 'SKU-APX-1002',
      barcode: '9312345000025',
      itemName: 'Thermal Transfer Desktop Label Printer 300DPI',
      description: 'High-speed industrial thermal label printer with Ethernet & USB.',
      costPrice: 310.00,
      sellingPrice: 599.00,
      status: 'ACTIVE',
      vendorId: 'vnd_usr_vendor_01',
      vendorEmail: 'vendor@logiqon.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
