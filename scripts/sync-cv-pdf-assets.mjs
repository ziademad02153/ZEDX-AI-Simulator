import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const destination = new URL('public/pdfjs/', root);
mkdirSync(destination, { recursive: true });
for (const [from, to] of [['build/pdf.min.mjs', 'pdf.min.mjs'], ['build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'], ['LICENSE', 'LICENSE']]) {
    copyFileSync(fileURLToPath(new URL(`node_modules/pdfjs-dist/${from}`, root)), fileURLToPath(new URL(to, destination)));
}
cpSync(fileURLToPath(new URL('node_modules/pdfjs-dist/standard_fonts/', root)), fileURLToPath(new URL('standard_fonts/', destination)), { recursive: true });
const dictionaryDestination = new URL('public/dictionaries/', root);
mkdirSync(dictionaryDestination, { recursive: true });
for (const [from, to] of [['index.aff', 'en.aff'], ['index.dic', 'en.dic'], ['license', 'LICENSE']]) {
    copyFileSync(fileURLToPath(new URL(`node_modules/dictionary-en/${from}`, root)), fileURLToPath(new URL(to, dictionaryDestination)));
}
