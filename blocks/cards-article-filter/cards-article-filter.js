import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

const HEADING = 'h1, h2, h3, h4, h5, h6';
const PARAM = 'category';
/* authoring keys of the optional config rows (not displayed) */
const CONFIG_KEYS = { all: 'all', 'filter-label': 'label' };

function unbutton(link) {
  link.classList.remove('button', 'primary', 'secondary');
  if (!link.className) link.removeAttribute('class');
  link.closest('.button-container')?.classList.remove('button-container');
}

/** Replace a link with its text so each card keeps a single link. */
function unlink(link) {
  link.replaceWith(...link.childNodes);
}

/**
 * Reads a two-cell config row ("All" | label, "Filter label" | label).
 * @param {Element} row
 * @returns {{key: string, value: string}|null}
 */
function readConfig(row) {
  const cells = [...row.children];
  if (cells.length !== 2 || row.querySelector('picture, img, a')) return null;
  const key = CONFIG_KEYS[toClassName(cells[0].textContent)];
  return key ? { key, value: cells[1].textContent.trim() } : null;
}

function buildMedia(row) {
  const picture = row.querySelector('picture');
  if (!picture) return null;
  const media = createTag('div', { class: 'cards-article-filter-image' });
  const img = picture.querySelector('img');
  const sameOrigin = img && new URL(img.src, window.location.href).origin === window.location.origin;
  if (sameOrigin) {
    media.append(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]));
    picture.remove();
  } else {
    media.append(picture);
  }
  return media;
}

/**
 * Build one card: [image] | [category, title (link), description, read time].
 * @param {Element} row authored row
 * @returns {{li: HTMLLIElement, category: string}}
 */
function buildCard(row) {
  const li = createTag('li', { class: 'cards-article-filter-card' });
  const media = buildMedia(row);

  const body = createTag('div', { class: 'cards-article-filter-body' });
  [...row.children].forEach((cell) => body.append(...cell.childNodes));
  body.querySelectorAll('p, div').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('picture, img')) el.remove();
  });
  body.querySelectorAll('a').forEach(unbutton);

  // title: a heading (ideally containing the link), else the first paragraph with a link
  const title = body.querySelector(HEADING)
    || [...body.children].find((el) => el.querySelector('a[href]'));
  const link = title?.querySelector('a[href]')
    || body.querySelector('a[href]');

  if (title) {
    title.classList.add('cards-article-filter-title');
    // everything before the title is the category label
    const before = [];
    let prev = title.previousElementSibling;
    while (prev) {
      before.unshift(prev);
      prev = prev.previousElementSibling;
    }
    before.forEach((el) => el.classList.add('cards-article-filter-category'));
    // after the title: description, then optional short read-time paragraph last
    const after = [];
    let next = title.nextElementSibling;
    while (next) {
      after.push(next);
      next = next.nextElementSibling;
    }
    if (after.length > 1) after[after.length - 1].classList.add('cards-article-filter-meta');
    after.filter((el) => !el.classList.contains('cards-article-filter-meta'))
      .forEach((el) => el.classList.add('cards-article-filter-description'));
  }

  if (link) {
    // move the link into the title heading if it was authored elsewhere
    if (title && !title.contains(link) && !title.querySelector('a')) {
      const linkParent = link.closest('p');
      link.replaceChildren(...title.childNodes);
      title.append(link);
      if (linkParent && !linkParent.textContent.trim()) linkParent.remove();
    }
    link.classList.add('cards-article-filter-link');
    li.classList.add('cards-article-filter-linked');
  }
  body.querySelectorAll('a').forEach((a) => { if (a !== link) unlink(a); });

  const category = body.querySelector('.cards-article-filter-category')?.textContent.trim() || '';
  if (category) li.dataset.category = toClassName(category);

  if (media) li.append(media);
  li.append(body);
  return { li, category };
}

/**
 * Article listing with category filter pills.
 * Optional config rows: "All" | show-all pill label; "Filter label" | group label.
 * Article rows: [image] | [category, title link, description, optional read time].
 * @param {Element} block The cards-article-filter block element
 */
export default function decorate(block) {
  const config = {};
  const list = createTag('ul', { class: 'cards-article-filter-list', role: 'list' });
  const categories = new Map();

  [...block.children].forEach((row) => {
    const entry = readConfig(row);
    if (entry) {
      config[entry.key] = entry.value;
      return;
    }
    const { li, category } = buildCard(row);
    if (category && !categories.has(li.dataset.category)) {
      categories.set(li.dataset.category, category);
    }
    list.append(li);
  });

  if (!categories.size) {
    block.replaceChildren(list);
    return;
  }

  const group = createTag('div', { class: 'cards-article-filter-pills', role: 'group' });
  if (config.label) group.setAttribute('aria-label', config.label);

  const pill = (slug, text) => createTag('button', {
    type: 'button', class: 'cards-article-filter-pill', 'data-filter': slug, 'aria-pressed': 'false',
  }, text);
  if (config.all) group.append(pill('', config.all));
  categories.forEach((text, slug) => group.append(pill(slug, text)));

  const apply = (slug) => {
    group.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === slug));
    });
    [...list.children].forEach((li) => {
      li.hidden = Boolean(slug) && li.dataset.category !== slug;
    });
  };

  group.addEventListener('click', (event) => {
    const btn = event.target.closest('button');
    if (!btn) return;
    // clicking the active category pill again shows all articles
    const slug = btn.getAttribute('aria-pressed') === 'true' ? '' : btn.dataset.filter;
    apply(slug);
    const url = new URL(window.location.href);
    if (slug) url.searchParams.set(PARAM, slug);
    else url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, '', url);
  });

  const requested = toClassName(new URLSearchParams(window.location.search).get(PARAM) || '');
  apply(categories.has(requested) ? requested : '');

  block.replaceChildren(group, list);
}
