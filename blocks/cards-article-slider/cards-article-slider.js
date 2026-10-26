import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

const HEADING = 'h1, h2, h3, h4, h5, h6';

function unbutton(link) {
  link.classList.remove('button', 'primary', 'secondary');
  if (!link.className) link.removeAttribute('class');
  link.closest('.button-container')?.classList.remove('button-container');
}

function removeIfEmpty(el) {
  if (el && !el.textContent.trim() && !el.querySelector('picture, img')) el.remove();
}

/**
 * Build one card from an authored row: [image] | [tag link, title heading, Read More link].
 * @param {Element} row authored row
 * @returns {HTMLLIElement}
 */
function buildCard(row) {
  const li = createTag('li', { class: 'cards-article-slider-card' });

  const picture = row.querySelector('picture');
  const media = createTag('div', { class: 'cards-article-slider-image' });
  if (picture) {
    const img = picture.querySelector('img');
    const parent = picture.parentElement;
    media.append(img
      ? createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }])
      : picture);
    picture.remove();
    if (parent !== row) removeIfEmpty(parent);
  }

  const body = createTag('div', { class: 'cards-article-slider-body' });
  [...row.children].forEach((cell) => body.append(...cell.childNodes));
  body.querySelectorAll('p, div').forEach(removeIfEmpty);
  body.querySelectorAll('a').forEach(unbutton);

  const heading = body.querySelector(HEADING);
  if (heading) {
    heading.classList.add('cards-article-slider-title');
    // everything authored before the title is the category tag line
    let prev = heading.previousElementSibling;
    while (prev) {
      prev.classList.add('cards-article-slider-tag');
      prev = prev.previousElementSibling;
    }
  }

  // the last link after the title is the card CTA; it also makes the whole card clickable
  const ctaLinks = [...body.querySelectorAll('a[href]')]
    .filter((a) => !a.closest('.cards-article-slider-tag'));
  const cta = ctaLinks[ctaLinks.length - 1];
  if (cta) {
    cta.classList.add('cards-article-slider-link');
    const container = cta.closest('p');
    if (container && !cta.closest(HEADING)) container.classList.add('cards-article-slider-action');
    li.classList.add('cards-article-slider-linked');
  }

  if (media.children.length) li.append(media);
  li.append(body);
  return li;
}

/**
 * Decorative progress track mirroring the list's horizontal scroll position.
 * Hidden from assistive tech: keyboard users reach every card through its links.
 * Pointer users can click or drag the track to scroll.
 * @param {HTMLElement} list scroll container
 * @returns {HTMLDivElement}
 */
function buildProgress(list) {
  const thumb = createTag('span', { class: 'cards-article-slider-thumb' });
  const track = createTag('div', { class: 'cards-article-slider-progress', 'aria-hidden': 'true' }, thumb);

  const update = () => {
    const { scrollWidth, clientWidth, scrollLeft } = list;
    const scrollable = scrollWidth - clientWidth > 1;
    track.classList.toggle('is-static', !scrollable);
    track.style.setProperty('--thumb-size', `${(clientWidth / scrollWidth) * 100}%`);
    track.style.setProperty('--thumb-offset', `${(scrollLeft / scrollWidth) * 100}%`);
  };

  const scrollToPointer = (event) => {
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    list.scrollLeft = ratio * list.scrollWidth - list.clientWidth / 2;
  };

  track.addEventListener('pointerdown', (event) => {
    track.setPointerCapture(event.pointerId);
    track.classList.add('is-dragging');
    scrollToPointer(event);
  });
  track.addEventListener('pointermove', (event) => {
    if (track.hasPointerCapture(event.pointerId)) scrollToPointer(event);
  });
  const release = (event) => {
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove('is-dragging');
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);

  list.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(list);
  update();

  return track;
}

/**
 * Article teaser cards in a horizontally scrolling slider.
 * Each row: [photo] | [category tag link, title heading, Read More link].
 * @param {Element} block The cards-article-slider block element
 */
export default function decorate(block) {
  const list = createTag('ul', { class: 'cards-article-slider-list', role: 'list' });
  [...block.children].forEach((row) => list.append(buildCard(row)));

  block.replaceChildren(list);
  if (list.children.length > 1) block.append(buildProgress(list));
}
