import fs from 'fs';

export interface UnitOfMeasureItem {
  id: string;
  code: string;
  name: string;
  description?: string;
}

import { ensureDataDir, dataFilePath } from './storage';
const UOM_FILE = dataFilePath('uom.json');

export function loadUOMs(): UnitOfMeasureItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(UOM_FILE)) {
      return JSON.parse(fs.readFileSync(UOM_FILE, 'utf-8'));
    }
  } catch (e) {}
  return getDefaultUOMs();
}

export function saveUOMs(uoms: UnitOfMeasureItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(UOM_FILE, JSON.stringify(uoms, null, 2), 'utf-8');
  } catch (e) {}
}

export function getDefaultUOMs(): UnitOfMeasureItem[] {
  return [
    { id: 'uom_pcs', code: 'PCS', name: 'Pieces', description: 'Individual single unit' },
    { id: 'uom_box', code: 'BOX', name: 'Box of 10', description: 'Standard pack of 10 units' },
    { id: 'uom_ctn', code: 'CTN', name: 'Carton of 50', description: 'Master shipping carton of 50 units' },
    { id: 'uom_plt', code: 'PLT', name: 'Pallet of 500', description: 'Standard Australian Wooden/Plastic Pallet' },
    { id: 'uom_kg', code: 'KG', name: 'Kilograms', description: 'Weight unit of measure' },
    { id: 'uom_mtr', code: 'MTR', name: 'Meters', description: 'Linear length measure for cabling & ribbons' },
    { id: 'uom_pk', code: 'PK', name: 'Pack of 100', description: 'Label & tag roll bundle' },
  ];
}
