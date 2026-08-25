import fs from 'fs';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
}

import { ensureDataDir, dataFilePath } from './storage';
const CATEGORIES_FILE = dataFilePath('categories.json');

export function loadCategories(): CategoryItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
    }
  } catch (e) {}
  return getDefaultCategoryTree();
}

export function saveCategories(categories: CategoryItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf-8');
  } catch (e) {}
}

export function getDefaultCategoryTree(): CategoryItem[] {
  return [
    // Top-Level Parent 1: Industrial Hardware & Scanners
    { id: 'cat_hw', name: 'Industrial Hardware', slug: 'industrial-hardware', parentId: null, description: 'Warehouse equipment, scanners, and terminals' },
    { id: 'cat_hw_scn', name: 'Barcode Scanners', slug: 'barcode-scanners', parentId: 'cat_hw', description: '1D & 2D handheld, Bluetooth, and fixed-mount scanners' },
    { id: 'cat_hw_mob', name: 'Mobile Computers', slug: 'mobile-computers', parentId: 'cat_hw', description: 'Rugged handheld Android touch computers' },

    // Top-Level Parent 2: Label Printing & Supplies
    { id: 'cat_prt', name: 'Label Printing', slug: 'label-printing', parentId: null, description: 'Thermal printers, ribbons, and barcode labels' },
    { id: 'cat_prt_dsk', name: 'Desktop Printers', slug: 'desktop-printers', parentId: 'cat_prt', description: 'Compact thermal transfer & direct thermal printers' },
    { id: 'cat_prt_ind', name: 'Industrial Printers', slug: 'industrial-printers', parentId: 'cat_prt', description: 'High-volume 24/7 heavy-duty label printers' },
    { id: 'cat_prt_lbl', name: 'Barcode Labels & Ribbons', slug: 'labels-ribbons', parentId: 'cat_prt', description: 'Direct thermal & thermal transfer label rolls' },

    // Top-Level Parent 3: RFID & Asset Tracking
    { id: 'cat_rfid', name: 'RFID & Tracking', slug: 'rfid-tracking', parentId: null, description: 'UHF RFID readers, antennas, and asset tags' },
    { id: 'cat_rfid_tags', name: 'RFID Smart Labels & Tags', slug: 'rfid-tags', parentId: 'cat_rfid', description: 'On-metal and printable UHF RFID adhesive tags' },
    { id: 'cat_rfid_rdr', name: 'RFID Fixed Readers', slug: 'rfid-readers', parentId: 'cat_rfid', description: 'Multi-port overhead portal RFID readers' },

    // Top-Level Parent 4: Warehouse Infrastructure & Supplies
    { id: 'cat_wh', name: 'Warehouse Supplies', slug: 'warehouse-supplies', parentId: null, description: 'Pallets, bins, racking labels, and packaging' },
    { id: 'cat_wh_bin', name: 'Location & Bin Markers', slug: 'bin-location-markers', parentId: 'cat_wh', description: 'Retro-reflective aisle and bin location barcode signs' },
    { id: 'cat_wh_plt', name: 'Pallets & Storage', slug: 'pallets-storage', parentId: 'cat_wh', description: 'Heavy-duty plastic pallets and storage containers' },
  ];
}
