import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

function isValueParagraph(el) {
  if (!el || el.tagName !== 'P') return false;
  const strong = el.querySelector(':scope > strong, :scope > b');
  return Boolean(strong) && strong.textContent.trim() === el.textContent.trim();
}

/**
 * Stat tiles. Each row: [icon image] | [bold stat value, description].
 * A heading may be used for the value instead of bold text.
 * @param {Element} block The cards-stats block element
 */
export default function decorate(block) {
  const ul = createTag('ul');

  [...block.children].forEach((row) => {
    const li = createTag('li');
    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture, .icon') && !c.textContent.trim());
    const icon = createTag('div', { class: 'cards-stats-icon' });
    const picture = row.querySelector('picture');
    const iconSpan = row.querySelector('span.icon');

    if (picture) {
      const img = picture.querySelector('img');
      const parent = picture.parentElement;
      icon.append(img ? createOptimizedPicture(img.src, img.alt || '', false, [{ width: '200' }]) : picture);
      picture.remove();
      if (parent?.tagName === 'P' && !parent.textContent.trim() && !parent.children.length) parent.remove();
    } else if (iconSpan) {
      icon.append(iconSpan);
    }

    const body = createTag('div', { class: 'cards-stats-body' });
    cells.filter((c) => c !== imageCell).forEach((c) => body.append(...c.childNodes));

    const value = [...body.children].find((el) => isValueParagraph(el) || /^H[1-6]$/.test(el.tagName));
    if (value) value.classList.add('cards-stats-value');

    if (icon.children.length) li.append(icon);
    li.append(body);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
