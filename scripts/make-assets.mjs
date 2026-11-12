// Prépare les images sources (icône 1024 px, écran de démarrage) à partir de icons/.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
const BG = "#0f2a3a";
mkdirSync("assets", { recursive: true });
const icon = "icons/icon-512.png", mask = "icons/icon-maskable-512.png";
// iOS refuse la transparence : on aplatit sur le fond de l'app
await sharp(icon).resize(1024, 1024, { kernel: "lanczos3" }).flatten({ background: BG }).png().toFile("assets/icon-only.png");
await sharp(mask).resize(1024, 1024, { kernel: "lanczos3" }).png().toFile("assets/icon-foreground.png");
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: BG } }).png().toFile("assets/icon-background.png");
const logo = await sharp(icon).resize(600, 600).png().toBuffer();
for (const f of ["splash.png", "splash-dark.png"])
  await sharp({ create: { width: 2732, height: 2732, channels: 3, background: BG } }).composite([{ input: logo, gravity: "center" }]).png().toFile(`assets/${f}`);
console.log("assets/ prêt");
