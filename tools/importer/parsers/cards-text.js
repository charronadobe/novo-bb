/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-text (follows the library "Cards (no images)" convention: 1 column,
 * one row per card; the block additionally accepts a small decorative icon at the top
 * of the cell).
 * Source: .splitlayout whose columns hold text-only .cmp-card tiles (global.novocare.com
 * food-noise and quality-weight-loss pages): optional icon, .title heading, .text paragraphs.
 * Card background class -> variant: cmp-card-bg-rose-pink* = pink, cmp-card-bg-light-blue* = blue,
 * cmp-card-bg-white = white.
 * Output: one row per card, single cell: [icon, h3, paragraphs].
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function variantOf(card) {
  const cls = card.className || '';
  if (/bg-rose-pink|bg-pink/.test(cls)) return 'pink';
  if (/bg-light-blue|bg-sea-blue|bg-blue/.test(cls)) return 'blue';
  if (/bg-white/.test(cls)) return 'white';
  return '';
}

export default function parse(element, { document }) {
  const cells = [];
  let variant = '';
  const cards = [...element.querySelectorAll('.cmp-card')].filter((c) => !c.parentElement.closest('.cmp-card'));

  cards.forEach((card) => {
    if (!variant) variant = variantOf(card);
    const cell = [];
    const icon = card.querySelector('img.cmp-card-icon, .cmp-card-icon-wrapper img, .image img');
    if (icon) {
      const img = document.createElement('img');
      img.src = icon.getAttribute('src');
      img.alt = '';
      cell.push(img);
    }
    card.querySelectorAll('.title h1, .title h2, .title h3, .title h4, .text p, .text ul, .text ol').forEach((el) => {
      if (!clean(el.textContent)) return;
      if (el.matches('p') && el.closest('ul, ol')) return;
      if (/^H\d$/.test(el.tagName)) {
        const h3 = document.createElement('h3');
        h3.textContent = clean(el.textContent);
        cell.push(h3);
      } else {
        cell.push(el.cloneNode(true));
      }
    });
    if (cell.length) cells.push([cell]);
  });

  const name = variant ? `cards-text (${variant})` : 'cards-text';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
