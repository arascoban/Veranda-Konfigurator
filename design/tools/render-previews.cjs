// Local SVG document rendering only; no browser, server or network access.
// Requires the workspace's bundled sharp dependency (set NODE_PATH accordingly).
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const root = path.resolve(__dirname, '..');
  await fs.mkdir(path.join(root, 'review'), { recursive: true });
  for (const name of ['D01-MASAUSTU', 'D01-TABLET', 'D01-TELEFON', 'D01-PROFIL-DETAIL', 'D01-UEBERSICHT']) {
    const source = path.join(root, name + '.svg');
    const out = path.join(root, 'review', name + '.png');
    await sharp(source).png().toFile(out);
    const info = await sharp(out).metadata();
    console.log(`${name}: ${info.width} × ${info.height}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
