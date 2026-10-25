/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-stats.
 * Source: the section's .cmp-container holding two .splitlayout .columns.threeCol rows
 * (global.novocare.com). Each .column contains a .mediatext with an icon image,
 * a .title heading (stat value) and a .text description.
 * Output: one block, one row per stat (6): [icon] | [bold stat value, description].
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function imageSrc(col) {
  const img = col.querySelector('.cmp-image img, figure img, img');
  if (img) {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    if (src && !src.startsWith('data:')) return { src, alt: img.getAttribute('alt') || '' };
  }
  const cmp = col.querySelector('.cmp-image[data-cmp-src], .cmp-image[data-asset]');
  if (cmp) return { src: cmp.getAttribute('data-cmp-src') || cmp.getAttribute('data-asset'), alt: '' };
  return null;
}

export default function parse(element, { document }) {
  const cells = [];
  const columns = [...element.querySelectorAll('.splitlayout .columns.threeCol > .column')];

  columns.forEach((col) => {
    // Cell 1: icon
    const imageCell = [];
    const info = imageSrc(col);
    if (info) {
      const img = document.createElement('img');
      img.src = info.src;
      // source alt text is a placeholder ("icon-1"); icons are decorative
      img.alt = /^icon-?\d*$/i.test(info.alt) ? '' : info.alt;
      imageCell.push(img);
    }

    // Cell 2: bold stat value + description
    const textCell = [];
    const heading = col.querySelector('.title h1, .title h2, .title h3, .title h4');
    if (heading && clean(heading.textContent)) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = clean(heading.textContent);
      p.append(strong);
      textCell.push(p);
    }
    col.querySelectorAll('.text p').forEach((srcP) => {
      const text = clean(srcP.textContent);
      if (!text) return;
      const p = document.createElement('p');
      p.textContent = text;
      textCell.push(p);
    });

    if (!imageCell.length && !textCell.length) return;
    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-stats', cells });
  element.replaceWith(block);
}
