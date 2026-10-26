/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-article-slider.
 * Source: .carousel.panelcontainer (global.novocare.com) - swiper slides, each holding a
 * .contentpageteaser > article.card with .card-image img, .card-body .tag a (category),
 * h2 title and an a.overlay-link to the article.
 * Output: one row per card: [photo] | [tag link paragraph, h4 title, Read More link].
 * Swiper loop clones (.swiper-slide-duplicate) and repeated article URLs are skipped.
 */
const SOURCE_ORIGIN = 'https://global.novocare.com';

function absolute(url) {
  if (!url || url.startsWith('data:')) return url;
  try {
    return new URL(url, SOURCE_ORIGIN).href;
  } catch (e) {
    return url;
  }
}

/** Pick the largest rendition from srcset/data attributes, falling back to src. */
function bestSrc(img) {
  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
  let best = null;
  let bestW = -1;
  srcset.split(',').map((s) => s.trim()).filter(Boolean).forEach((entry) => {
    const [url, desc] = entry.split(/\s+/);
    const w = desc ? parseFloat(desc) : 0;
    if (url && !url.startsWith('data:') && w >= bestW) { best = url; bestW = w; }
  });
  const candidates = [best, img.getAttribute('data-src'), img.getAttribute('src')];
  const src = candidates.find((c) => c && !c.startsWith('data:'));
  return absolute(src);
}

function text(el) {
  return (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];
  const seen = new Set();

  let slides = [...element.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)')];
  if (!slides.length) slides = [...element.querySelectorAll('.contentpageteaser')];

  slides.forEach((slide) => {
    const card = slide.querySelector('article.card, .card') || slide;
    const overlay = card.querySelector('a.overlay-link[href]');
    const titleEl = card.querySelector('.card-body h1, .card-body h2, .card-body h3, .card-body h4, h2, h3');
    const title = text(titleEl) || (card.getAttribute('title') || '').trim() || text(overlay);
    const href = overlay ? overlay.getAttribute('href') : '';
    const key = href || title;
    if (!key || seen.has(key)) return;
    seen.add(key);

    // Cell 1: photo
    const imageCell = [];
    const srcImg = card.querySelector('.card-image img');
    const src = srcImg ? bestSrc(srcImg) : '';
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = srcImg.getAttribute('alt') || title;
      imageCell.push(img);
    }

    // Cell 2: tag link, title heading, Read More link
    const textCell = [];
    const tagLink = card.querySelector('.card-body .tag a[href]');
    if (tagLink && text(tagLink)) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = tagLink.getAttribute('href');
      a.textContent = text(tagLink);
      p.append(a);
      textCell.push(p);
    }
    if (title) {
      // section heading "Related articles" is an h3, so card titles are h4
      const h = document.createElement('h4');
      h.textContent = title;
      textCell.push(h);
    }
    if (href) {
      const body = card.querySelector('.card-body');
      const label = (body && body.getAttribute('data-read-more'))
        || (titleEl && titleEl.getAttribute('data-read-more'))
        || 'Read More';
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label.trim();
      p.append(a);
      textCell.push(p);
    }

    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article-slider', cells });
  element.replaceWith(block);
}
