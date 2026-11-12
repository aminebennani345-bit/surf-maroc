// Applique le numéro de version aux projets natifs.
// Version affichée = "version" de package.json ; numéro de build = BUILD_NUMBER (CI) ou 1.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const name = JSON.parse(readFileSync("package.json", "utf8")).version;
const build = String(parseInt(process.env.BUILD_NUMBER || "1", 10));
const patch = (f, pairs) => {
  if (!existsSync(f)) return;
  let s = readFileSync(f, "utf8");
  for (const [re, rep] of pairs) s = s.replace(re, rep);
  writeFileSync(f, s);
  console.log("version", name, "build", build, "→", f);
};
patch("android/app/build.gradle", [[/versionCode \d+/, `versionCode ${build}`], [/versionName "[^"]*"/, `versionName "${name}"`]]);
patch("ios/App/App.xcodeproj/project.pbxproj", [[/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`], [/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${name};`]]);
