// Copie la web app (fichiers du site) dans www/, le dossier embarqué dans l'appli.
import { rmSync, mkdirSync, cpSync } from "node:fs";
const FILES = ["index.html", "app.js", "sw.js", "manifest.webmanifest", "privacy.html", "icons"];
rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log("www/ prêt :", FILES.join(", "));
