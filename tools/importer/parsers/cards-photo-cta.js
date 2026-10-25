/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-photo-cta.
 * Source: .splitlayout:has(.cmp-card) (global.novocare.com) - .column items with
 * .cmp-card (background photo + icon badge), a .title heading and a .ctabutton link.
 * Output: one row per card: [photo, icon image] | [heading, CTA link].
 */
function copyImg(document, src) {
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src.getAttribute('src');
  img.alt = src.getAttribute('alt') || '';
  return img;
}

export default function parse(element, { document }) {
  const cells = [];
  const columns = [...element.querySelectorAll(':scope > .columns > .column')];
  const items = columns.length ? columns : [...element.querySelectorAll('.column')];

  items.forEach((col) => {
    const card = col.querySelector('.cmp-card');
    if (!card) return;

    // Cell 1: photo + icon badge
    const imageCell = [];
    const photo = copyImg(document, card.querySelector('img.cmp-card-background, .cmp-card-image-wrapper img'));
    const icon = copyImg(document, card.querySelector('img.cmp-card-icon, .cmp-card-icon-wrapper img'));
    if (photo) imageCell.push(photo);
    if (icon) imageCell.push(icon);

    // Cell 2: heading + CTA
    const textCell = [];
    const srcHeading = col.querySelector(':scope > .title h1, :scope > .title h2, :scope > .title h3, :scope > .title h4');
    if (srcHeading && srcHeading.textContent.trim()) {
      // section already has an h2 title; cards use h3 for a valid hierarchy
      const h3 = document.createElement('h3');
      h3.textContent = srcHeading.textContent.replace(/\s+/g, ' ').trim();
      textCell.push(h3);
    }
    col.querySelectorAll(':scope > .text p').forEach((p) => {
      if (p.textContent.trim()) textCell.push(p.cloneNode(true));
    });
    const cta = col.querySelector('.ctabutton a[href]');
    if (cta) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = cta.getAttribute('href');
      a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
      p.append(a);
      textCell.push(p);
    }

    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-photo-cta', cells });
  element.replaceWith(block);
}
