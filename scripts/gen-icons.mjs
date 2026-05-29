// Genera los iconos PNG de la PWA a partir de public/icon-source.svg (con sharp).
// Ejecutar desde la raíz del proyecto: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icon-source.svg');

const salidas = [
  ['public/pwa-512x512.png', 512],
  ['public/pwa-192x192.png', 192],
  ['public/apple-touch-icon.png', 180],
  ['public/favicon-32.png', 32],
];

for (const [archivo, size] of salidas) {
  await sharp(svg, { density: 512 }).resize(size, size, { fit: 'cover' }).png().toFile(archivo);
  console.log(`  ${archivo} (${size}px)`);
}

console.log('✅ Iconos generados desde icon-source.svg');
