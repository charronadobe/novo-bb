import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

function optimize(picture, width) {
  const img = picture.querySelector('img');
  if (!img) return picture;
  return createOptimizedPicture(img.src, img.alt || '', false, [{ width }]);
}

function removeIfEmpty(el) {
  if (el && el.tagName === 'P' && !el.textContent.trim() && !el.children.length) el.remove();
}

/**
 * Photo cards with an optional icon badge, heading and CTA.
 * Each row: [photo (+ optional second image or :icon: as badge)] | [heading, text, CTA link].
 * @param {Element} block The cards-photo-cta block element
 */
export default function decorate(block) {
  const ul = createTag('ul');

  [...block.children].forEach((row) => {
    const li = createTag('li');
    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture, .icon') && !c.textContent.trim());
    const pictures = [...row.querySelectorAll('picture')];
    const icon = (imageCell || row).querySelector('span.icon');

    const media = createTag('div', { class: 'cards-photo-cta-image' });
    if (pictures[0]) {
      const parent = pictures[0].parentElement;
      media.append(optimize(pictures[0], '750'));
      pictures[0].remove();
      removeIfEmpty(parent);
    }
    const badge = pictures[1] || icon;
    if (badge) {
      const parent = badge.parentElement;
      media.append(createTag('span', { class: 'cards-photo-cta-icon' }, badge.tagName === 'PICTURE' ? optimize(badge, '96') : badge));
      removeIfEmpty(parent);
    }

    const body = createTag('div', { class: 'cards-photo-cta-body' });
    cells.filter((c) => c !== imageCell).forEach((c) => body.append(...c.childNodes));
    body.querySelectorAll('p').forEach(removeIfEmpty);

    const cta = [...body.querySelectorAll('a[href]')].pop();
    if (cta) {
      const container = cta.closest('p');
      if (container) container.classList.add('cards-photo-cta-action');
    }

    if (media.children.length) li.append(media);
    li.append(body);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
