/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media.
 * Source: .mediatext.mediatext--left (global.novocare.com) - figure.media image
 * beside section.quote-area (heading, text, CTA).
 * Output: one row, two cells: [image] | [heading, paragraph(s), CTA link].
 */
export default function parse(element, { document }) {
  const imageCell = [];
  const img = element.querySelector('figure.media img, .cmp-image img, img');
  if (img) {
    const image = document.createElement('img');
    image.src = img.getAttribute('src') || img.getAttribute('data-src');
    image.alt = img.getAttribute('alt') || '';
    imageCell.push(image);
  }

  const textCell = [];
  const area = element.querySelector('.quote-area') || element;
  const heading = area.querySelector('.title h1, .title h2, .title h3, .title h4');
  if (heading && heading.textContent.trim()) {
    const h2 = document.createElement('h2');
    h2.textContent = heading.textContent.replace(/\s+/g, ' ').trim();
    textCell.push(h2);
  }
  area.querySelectorAll('.text p').forEach((p) => {
    if (p.textContent.replace(/ /g, ' ').trim()) textCell.push(p.cloneNode(true));
  });
  const cta = area.querySelector('.ctabutton a[href]');
  if (cta) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = cta.textContent.replace(/\s+/g, ' ').trim();
    p.append(a);
    textCell.push(p);
  }

  const cells = [[imageCell, textCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
