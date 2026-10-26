/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-photo-cta.
 * Sources (global.novocare.com): .splitlayout whose .column items hold
 * - a .cmp-card (background photo + icon badge), a .title heading and a .ctabutton link, or
 * - an .image photo, .title heading, .text and an optional .ctabutton, or
 * - a .mediatext card (photo, heading, text, button).
 * Output: one row per card: [photo, icon image] | [heading, text, CTA link].
 */
function copyImg(document, src) {
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src.getAttribute('src') || src.getAttribute('data-src');
  img.alt = src.getAttribute('alt') || '';
  return img;
}

function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];
  const columns = [...element.querySelectorAll(':scope > .columns > .column')];
  const items = columns.length ? columns : [...element.querySelectorAll('.column')];

  items.forEach((col) => {
    const card = col.querySelector('.cmp-card');
    const imageCell = [];
    if (card) {
      const photo = copyImg(document, card.querySelector('img.cmp-card-background, .cmp-card-image-wrapper img'));
      const icon = copyImg(document, card.querySelector('img.cmp-card-icon, .cmp-card-icon-wrapper img'));
      if (photo) imageCell.push(photo);
      if (icon) imageCell.push(icon);
    } else {
      const photo = copyImg(document, col.querySelector('.image img, .cmp-image img, figure img'));
      if (photo) imageCell.push(photo);
    }

    const textCell = [];
    col.querySelectorAll('.title h1, .title h2, .title h3, .title h4, .text p').forEach((el) => {
      if (card && card.contains(el)) return;
      const text = clean(el.textContent);
      if (!text) return;
      if (/^H\d$/.test(el.tagName)) {
        // section already has an h2 title; cards use h3 for a valid hierarchy
        const h3 = document.createElement('h3');
        h3.textContent = text;
        textCell.push(h3);
      } else {
        textCell.push(el.cloneNode(true));
      }
    });
    col.querySelectorAll('.ctabutton a[href]').forEach((cta) => {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = cta.getAttribute('href');
      a.textContent = clean(cta.textContent);
      p.append(a);
      textCell.push(p);
    });

    if (!imageCell.length && !textCell.length) return;
    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-photo-cta', cells });
  element.replaceWith(block);
}
