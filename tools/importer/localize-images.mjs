#!/usr/bin/env node
/*
 * Post-import step: replace Dynamic Media / Scene7 image URLs in imported pages with
 * local image files that have a real file extension.
 *
 * Why: Scene7 URLs (https://images.novonordisk.com/is/image/… and /is/content/…) have no
 * file extension, and the server rejects URLs that add one. Document Authoring's import
 * helper recognises images by the extension in the URL path, so these images are skipped
 * when pages are uploaded and show as broken in the editor.
 *
 * What it does, for every <img src> / <source srcset> pointing at a Scene7 URL:
 *   1. downloads the image (default rendition, as the source site serves it)
 *   2. saves it to content/images/<asset-name>.<ext>, the extension taken from the
 *      response content type (jpg, png, gif, svg, webp)
 *   3. rewrites the reference to the relative path images/<asset-name>.<ext> (../images/…
 *      for pages in sub-folders)
 *
 * Run after the bulk import, from the project root:
 *   node tools/importer/localize-images.mjs                 # all content/*.plain.html
 *   node tools/importer/localize-images.mjs content/index.plain.html
 */
import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = 'content';
const IMAGES_DIR = path.join(CONTENT_DIR, 'images');
const DM_URL = /https?:\/\/[^"'\s,]+\/is\/(?:image|content)\/[^"'\s,]+/g;
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

/** Asset name from a Scene7 URL: last path segment, without a :preset suffix or query. */
function assetName(url) {
  const { pathname } = new URL(url);
  return decodeURIComponent(pathname.split('/').pop()).split(':')[0].replace(/[^a-z0-9-_]/gi, '-');
}

async function download(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const type = (resp.headers.get('content-type') || '').split(';')[0].trim();
  const ext = EXTENSIONS[type];
  if (!ext) throw new Error(`unsupported content type "${type}"`);
  const file = `${assetName(url)}.${ext}`;
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMAGES_DIR, file), Buffer.from(await resp.arrayBuffer()));
  return `images/${file}`;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.plain.html')).map((f) => path.join(CONTENT_DIR, f));

const localized = new Map(); // Scene7 URL -> local path (shared across pages)
let failures = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  // only rewrite URLs used as image sources, not links (e.g. video links in cards-video)
  const refs = new Set();
  html.replace(/<(?:img|source)\b[^>]*>/gi, (tag) => {
    (tag.match(DM_URL) || []).forEach((u) => refs.add(u));
    return tag;
  });
  if (!refs.size) {
    console.log(`${file}: no Scene7 images`);
    continue;
  }

  for (const url of refs) {
    if (localized.has(url)) continue;
    try {
      localized.set(url, await download(url));
      console.log(`  ✓ ${url} -> ${localized.get(url)}`);
    } catch (e) {
      failures += 1;
      console.error(`  ✗ ${url}: ${e.message} (left unchanged)`);
    }
  }

  // paths are relative to the page: pages in sub-folders need ../ to reach content/images
  const up = path.relative(path.dirname(file), CONTENT_DIR).split(path.sep).join('/');
  const local = (u) => (localized.has(u) ? `${up ? `${up}/` : ''}${localized.get(u)}` : u);
  const updated = html.replace(/<(?:img|source)\b[^>]*>/gi, (tag) => tag.replace(DM_URL, local));
  if (updated !== html) {
    fs.writeFileSync(file, updated);
    console.log(`${file}: ${[...refs].filter((u) => localized.has(u)).length} image reference(s) localized`);
  }
}

process.exitCode = failures ? 1 : 0;
