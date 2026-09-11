#!/usr/bin/env node
// Génère un QR code (PNG + SVG) aux couleurs du site, prêt à imprimer.
// Usage : npm run qr -- https://votre-site.exemple.com

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const url = process.argv[2];

if (!url) {
  console.error("Usage : npm run qr -- https://votre-site.exemple.com");
  process.exit(1);
}

const outDir = path.resolve("qr-code");
await mkdir(outDir, { recursive: true });

const colors = {
  dark: "#597059", // vert sauge
  light: "#fbf8f100", // fond transparent
};

const pngPath = path.join(outDir, "qr-code.png");
const svgPath = path.join(outDir, "qr-code.svg");

await QRCode.toFile(pngPath, url, {
  type: "png",
  width: 1200,
  margin: 2,
  color: colors,
});

const svg = await QRCode.toString(url, {
  type: "svg",
  margin: 2,
  color: colors,
});
await writeFile(svgPath, svg);

console.log(`QR code généré pour : ${url}`);
console.log(`  - ${pngPath}`);
console.log(`  - ${svgPath}`);
console.log("Vous pouvez maintenant l'imprimer ou l'intégrer à votre carton d'invitation.");
