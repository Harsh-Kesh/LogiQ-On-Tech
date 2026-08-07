import fs from 'fs';
import path from 'path';

export interface UnitOfMeasureItem {
  id: string;
  code: string;
  name: string;
  description?: string;
}

const UOM_FILE = path.join(process.cwd(), '.data', 'uom.json');

function ensureDirExists() {
  const dir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadUOMs(): UnitOfMeasureItem[] {
  ensureDirExists();
  try {
    if (fs.existsSync(UOM_FILE)) {
      return JSON.parse(fs.readFileSync(UOM_FILE, 'utf-8'));
    }
  } catch (e) {}
  return getDefaultUOMs();
}

export function saveUOMs(uoms: UnitOfMeasureItem[]) {
  ensureDirExists();
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
