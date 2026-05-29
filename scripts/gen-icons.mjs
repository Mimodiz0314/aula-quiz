// Genera los iconos PNG de la PWA a partir del logo de marca EduMaster (scripts/brand-source.png).
// - "any": navy a sangre completa (recorta el fondo blanco y las esquinas redondeadas).
// - "maskable": el símbolo con margen de seguridad sobre navy (para iconos adaptativos Android).
// Ejecutar desde la raíz: node scripts/gen-icons.mjs
import sharp from 'sharp';

const SRC = 'scripts/brand-source.png';

// 1) Recorta el fondo blanco -> recuadro navy. 2) Zoom + crop central -> sangre completa.
const trimmed = await sharp(SRC).trim({ threshold: 20 }).toBuffer();
const coverBuf = await sharp(trimmed)
  .resize(600, 600, { fit: 'cover' })
  .extract({ left: 44, top: 44, width: 512, height: 512 })
  .png()
  .toBuffer();

// Color navy del fondo (esquina del cover) para rellenar la versión maskable.
const c = await sharp(coverBuf).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer();
const navy = { r: c[0], g: c[1], b: c[2] };
console.log('navy de marca:', navy);

// Iconos "any"
for (const [file, size] of [
  ['public/pwa-512x512.png', 512],
  ['public/pwa-192x192.png', 192],
  ['public/apple-touch-icon.png', 180],
  ['public/favicon-32.png', 32],
]) {
  await sharp(coverBuf).resize(size, size).png().toFile(file);
  console.log('  any:', file);
}

// Iconos "maskable" (símbolo al 70%, resto navy)
for (const [file, size] of [
  ['public/pwa-maskable-512x512.png', 512],
  ['public/pwa-maskable-192x192.png', 192],
]) {
  const inner = Math.round(size * 0.7);
  const innerBuf = await sharp(coverBuf).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: navy } })
    .composite([{ input: innerBuf, gravity: 'center' }])
    .png()
    .toFile(file);
  console.log('  maskable:', file);
}

console.log('✅ Iconos generados desde la marca EduMaster');
