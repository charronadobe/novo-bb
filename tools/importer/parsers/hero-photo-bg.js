/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-photo-bg.
 * Source: figure.banner (global.novocare.com heroes).
 * Rows: [background image], [overlay content in source order: eyebrow/subheading
 * paragraphs, H1 title, CTA links (one paragraph each)].
 */
function hasText(el) {
  return el.textContent.replace(/ /g, ' ').trim() !== '';
}

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

  // Row 2: overlay content, in source order
  const overlay = element.querySelector('.banner-overlay') || element;
  const content = [];
  let hasH1 = false;
  overlay.querySelectorAll('.title h1, .title h2, .title h3, .text p, .ctabutton a[href], .cta a[href]').forEach((el) => {
    if (el.matches('a')) {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = el.getAttribute('href');
      a.textContent = text;
      p.append(a);
      content.push(p);
      return;
    }
    if (!hasText(el)) return;
    if (/^H\d$/.test(el.tagName)) {
      const h = document.createElement(hasH1 ? 'h2' : 'h1');
      hasH1 = true;
      h.innerHTML = el.innerHTML.trim();
      content.push(h);
      return;
    }
    const para = document.createElement('p');
    para.innerHTML = el.innerHTML;
    content.push(para);
  });

  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-photo-bg', cells });
  element.replaceWith(block);
}
