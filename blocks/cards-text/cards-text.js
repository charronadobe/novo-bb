import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

/*
 * cards-text: one row per card, a single cell with an optional icon image,
 * a heading and paragraphs. Options pink / blue / white set the card colour.
 */

function optimize(picture) {
  const img = picture.querySelector('img');
  if (!img) return picture;
  // only same-origin (author-uploaded) images support the optimization params
  const sameOrigin = new URL(img.src, window.location.href).origin === window.location.origin;
  const isSvg = /\.svg(\?|#|$)/i.test(img.src);
  if (!sameOrigin || isSvg) return picture;
  return createOptimizedPicture(img.src, img.alt || '', false, [{ width: '200' }]);
}

function decorateCard(row) {
  const li = createTag('li');
  const content = [...row.children].flatMap((cell) => [...cell.childNodes]);
  const body = createTag('div', { class: 'cards-text-body' }, content);

  // a picture before any text is the card icon
  const first = [...body.children].find((el) => el.textContent.trim() || el.querySelector('picture'));
  const picture = first?.tagName === 'PICTURE' ? first : first?.querySelector(':scope > picture');
  if (picture && (first === picture || !first.textContent.trim())) {
    const icon = createTag('div', { class: 'cards-text-icon' }, optimize(picture));
    if (first !== picture) first.remove();
    li.append(icon);
  }
  if (body.textContent.trim() || body.querySelector('picture')) li.append(body);
  return li;
}

/** @param {Element} block The cards-text block element */
export default function decorate(block) {
  const ul = createTag('ul');
  [...block.children].forEach((row) => ul.append(decorateCard(row)));
  block.classList.add(`cards-text-${Math.min(ul.children.length, 4)}`);
  block.replaceChildren(ul);
}
