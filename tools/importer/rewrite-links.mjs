#!/usr/bin/env node
/*
 * Post-import step: make links in imported pages work on this site.
 *
 * - Links to pages that are migrated (every URL in tools/importer/page-templates.json, using
 *   its targetPaths entry when there is one) become site-relative paths without ".html",
 *   e.g. https://global.novocare.com/food-noise.html -> /food-noise and
 *   /what-is-obesity.html -> /obesity/what-is-obesity. The query string is dropped, the
 *   #fragment is kept. Category filter links (?filters=<category>) go to the articles listing
 *   with that category preselected: /articles?category=<category>.
 * - Other links to the source site (relative "/x.html" or absolute) become absolute links to
 *   https://global.novocare.com so they keep working until those pages are migrated.
 * - Links to PDFs on the source site are downloaded to content/pdfs/<file>.pdf and rewritten
 *   to a page-relative path (pdfs/… or ../pdfs/…), because the source refuses to be framed
 *   by the PDF viewer. PDFs over 20 MB (the EDS preview limit) keep their source link.
 *
 * Run after the bulk import (and localize-images.mjs), from the project root:
 *   node tools/importer/rewrite-links.mjs content/food-noise.plain.html [...]
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = 'https://global.novocare.com';
const CONTENT_DIR = 'content';
const PDF_DIR = path.join(CONTENT_DIR, 'pdfs');
const MAX_PDF_BYTES = 20 * 1024 * 1024;

function pagePath(pathname) {
  const p = pathname.replace(/\.html?$/, '').replace(/\/$/, '');
  return p === '' ? '/' : p;
}

const templates = JSON.parse(fs.readFileSync('tools/importer/page-templates.json', 'utf8')).templates;
const migrated = new Map(); // source page path -> site path
templates.forEach((t) => {
  (t.urls || []).forEach((u) => {
    const target = (t.targetPaths || {})[u];
    const src = pagePath(new URL(u).pathname);
    migrated.set(src, target || (src === '/' ? '/' : src));
  });
});

const pdfs = new Map(); // source URL -> file name under content/pdfs
async function localizePdf(url) {
  if (pdfs.has(url)) return pdfs.get(url);
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop())
    .toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = Buffer.from(await resp.arrayBuffer());
  // EDS preview rejects files over 20 MB: keep linking to the source copy
  if (data.length > MAX_PDF_BYTES) {
    pdfs.set(url, null);
    return null;
  }
  fs.mkdirSync(PDF_DIR, { recursive: true });
  fs.writeFileSync(path.join(PDF_DIR, name), data);
  pdfs.set(url, name);
  return name;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node tools/importer/rewrite-links.mjs content/<page>.plain.html [...]');
  process.exit(1);
}

let failures = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const up = path.relative(path.dirname(file), CONTENT_DIR).split(path.sep).join('/');
  const hrefs = new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
  const map = new Map();

  for (const raw of hrefs) {
    const href = raw.replace(/&amp;/g, '&');
    let url;
    try {
      url = new URL(href, `${SOURCE}/`);
    } catch (e) {
      continue;
    }
    const isSource = href.startsWith('/') || url.origin === SOURCE;
    if (!isSource || href.startsWith('//') || /^(mailto|tel):/.test(href) || href.startsWith('#')) continue;

    if (/\.pdf$/i.test(url.pathname)) {
      try {
        const name = await localizePdf(url.href);
        map.set(raw, name ? `${up ? `${up}/` : ''}pdfs/${name}` : url.href);
      } catch (e) {
        failures += 1;
        console.error(`  ✗ ${url.href}: ${e.message} (left unchanged)`);
      }
      continue;
    }
    if (url.pathname.startsWith('/content/dam/')) {
      map.set(raw, url.href);
      continue;
    }
    // category filter links (e.g. /what-is-obesity.html?filters=heart-disease) open the
    // articles listing filtered on that category
    const filter = url.searchParams.get('filters');
    if (filter && migrated.has('/articles')) {
      map.set(raw, `${migrated.get('/articles')}?category=${encodeURIComponent(filter.split(',')[0])}`);
      continue;
    }
    const target = migrated.get(pagePath(url.pathname));
    if (target) map.set(raw, `${target}${url.hash}`);
    else map.set(raw, `${SOURCE}${url.pathname}${url.search}${url.hash}`.replace(/&/g, '&amp;'));
  }

  let updated = html;
  map.forEach((to, from) => {
    if (to !== from) updated = updated.split(`href="${from}"`).join(`href="${to}"`);
  });
  if (updated !== html) fs.writeFileSync(file, updated);
  const changed = [...map].filter(([a, b]) => a !== b);
  console.log(`${file}: ${changed.length} link(s) rewritten`);
  changed.forEach(([a, b]) => console.log(`  ${a.length > 70 ? `${a.slice(0, 67)}...` : a} -> ${b}`));
}
process.exitCode = failures ? 1 : 0;
