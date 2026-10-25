/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-photo-bg.
 * Source: figure.banner (global.novocare.com home hero).
 * Rows: [background image], [H1 title + subheading paragraph(s) + CTA link].
 */
export default function parse(element, { document }) {
  const cells = [];

  // Row 1: background image
  const img = element.querySelector('.cmp-image img, picture img, img');
  if (img) {
    const image = document.createElement('img');
    image.src = img.getAttribute('src');
    image.alt = img.getAttribute('alt') || '';
    cells.push([image]);
  }

  // Row 2: text content
  const overlay = element.querySelector('.banner-overlay') || element;
  const content = [];

  const heading = overlay.querySelector('h1, h2, h3');
  if (heading) {
    const h1 = document.createElement('h1');
    h1.innerHTML = heading.innerHTML.trim();
    content.push(h1);
  }

  // Subheading paragraphs with real text (skip &nbsp; spacers)
  overlay.querySelectorAll('.text p').forEach((p) => {
    const text = p.textContent.replace(/ /g, ' ').trim();
    if (text) {
      const para = document.createElement('p');
      para.innerHTML = p.innerHTML;
      content.push(para);
    }
  });

  // CTA link
  const cta = overlay.querySelector('.ctabutton a[href], .cta a[href]');
  if (cta) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = cta.getAttribute('href');
    a.textContent = cta.textContent.trim();
    p.append(a);
    content.push(p);
  }

  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-photo-bg', cells });
  element.replaceWith(block);
}
