import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join(process.cwd(), '.data');
const isServerless = !!process.env.VERCEL;

export const DATA_DIR = isServerless ? path.join('/tmp', '.data') : SOURCE_DIR;

let seeded = false;

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (isServerless && !seeded && fs.existsSync(SOURCE_DIR)) {
    seeded = true;
    try {
      const files = fs.readdirSync(SOURCE_DIR);
      for (const file of files) {
        const dest = path.join(DATA_DIR, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(SOURCE_DIR, file), dest);
        }
      }
    } catch {}
  }
}

export function dataFilePath(filename: string): string {
  return path.join(DATA_DIR, filename);
}
