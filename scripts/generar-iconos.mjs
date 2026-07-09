// Genera los PNG del PWA a partir de public/icons/icon.svg
// Uso:  node scripts/generar-iconos.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(raiz, "public/icons/icon.svg"));
const salida = join(raiz, "public/icons");

const tareas = [
  { archivo: "icon-192.png", tam: 192 },
  { archivo: "icon-512.png", tam: 512 },
  { archivo: "icon-maskable-512.png", tam: 512 },
  { archivo: "apple-touch-icon.png", tam: 180 },
];

for (const { archivo, tam } of tareas) {
  await sharp(svg, { density: 384 })
    .resize(tam, tam)
    .png()
    .toFile(join(salida, archivo));
  console.log("✓", archivo);
}
console.log("Iconos generados.");
