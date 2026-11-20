// Runs the supplier-invoice reader on real PDFs and prints what it extracted — nothing is saved.
//   1. Put ANTHROPIC_API_KEY=... in .env.local (gitignored; without it the basic regex reader runs)
//   2. npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-invoice-reader.ts <invoice.pdf> [more.pdf ...]
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseInvoicePdf } from '../src/lib/invoice-parser';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: scripts/check-invoice-reader.ts <invoice.pdf> [more.pdf ...]');
  process.exit(1);
}
console.log(process.env.ANTHROPIC_API_KEY ? 'Reader: Claude' : 'Reader: basic regex (no ANTHROPIC_API_KEY in .env.local)');

(async () => {
  for (const file of files) {
    console.log(`\n=== ${basename(file)}`);
    try {
      const started = Date.now();
      const parsed = await parseInvoicePdf(readFileSync(file));
      console.log(JSON.stringify(parsed, null, 2));
      console.log(`(${((Date.now() - started) / 1000).toFixed(1)} s)`);
    } catch (err: any) {
      console.error('FAILED:', err.message);
      process.exitCode = 1;
    }
  }
})();
