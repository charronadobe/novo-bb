/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-article-filter (library Cards convention: 2 columns, one row per card:
 * image cell | text cell; plus an optional leading "All" config row).
 * Source: .contentcategoryfilter vue-isotope (global.novocare.com articles page). The
 * articles are in its :data-config JSON ({ sortByDate, categories[], teasers[] }) and the
 * labels in :data-label ({ readTimeLabel, allLabel, ... }) - the cards are rendered client-side.
 * Output: config row [All | label], then one row per article (newest first):
 *   [image] | [category, h3 > title link, description, "<minutes> <readTimeLabel>"].
 */
function parseAttr(el, name) {
  const raw = el.getAttribute(name) || '{}';
  try {
    return JSON.parse(raw);
  } catch (e) {
    // labels use single quotes
    try {
      return JSON.parse(raw.replace(/'/g, '"'));
    } catch (e2) {
      return {};
    }
  }
}

// Once Vue has mounted (live import), the JSON attributes are gone: read the rendered
// filter labels and article.card teasers instead.
function fromRendered(element) {
  const labels = {};
  const pill = element.querySelector('nav label, nav button');
  if (pill) labels.allLabel = pill.textContent.replace(/\s+/g, ' ').trim();
  const teasers = [...element.querySelectorAll('article.card')].map((card) => {
    const readTime = card.querySelector('.read-time');
    const time = readTime ? readTime.textContent.replace(/\s+/g, ' ').trim() : '';
    const m = time.match(/^(\d+)\s+(.*)$/);
    if (m) labels.readTimeLabel = m[2];
    const category = card.querySelector('.category');
    const title = [...card.querySelectorAll('.card-body > strong')].find((s) => !s.classList.contains('category'));
    const link = card.querySelector('a.overlay-link[href], a[href]');
    const img = card.querySelector('.card-image img');
    return {
      title: title ? title.textContent : '',
      link: link ? link.getAttribute('href') : '',
      description: card.querySelector('.card-body > p')?.textContent || '',
      minutes: m ? m[1] : '',
      imageSource: img ? img.getAttribute('src') : '',
      categories: category ? [{ text: category.textContent.replace(/\s+/g, ' ').trim() }] : [],
    };
  });
  return { config: { teasers }, labels };
}

export default function parse(element, { document, url }) {
  const vue = element.querySelector('vue-isotope') || element;
  let config = parseAttr(vue, ':data-config');
  let labels = parseAttr(vue, ':data-label');
  if (!config.teasers) ({ config, labels } = fromRendered(element));
  const origin = new URL(url || 'https://global.novocare.com/').origin;
  const teasers = [...(config.teasers || [])];
  if (config.sortByDate) teasers.sort((a, b) => (b.articlePublishedDate || 0) - (a.articlePublishedDate || 0));

  const cells = [];
  if (labels.allLabel) cells.push(['All', labels.allLabel]);

  teasers.forEach((t) => {
    if (!t.title || !t.link) return;
    const imageCell = [];
    const src = t.imageSource || t.imageSourceDynamicMedia;
    if (src) {
      const img = document.createElement('img');
      img.src = new URL(src, origin).href;
      img.alt = '';
      imageCell.push(img);
    }
    const textCell = [];
    const category = t.categories && t.categories[0] && t.categories[0].text;
    if (category) {
      const p = document.createElement('p');
      p.textContent = category;
      textCell.push(p);
    }
    const h3 = document.createElement('h3');
    const a = document.createElement('a');
    a.href = t.link;
    a.textContent = t.title.trim();
    h3.append(a);
    textCell.push(h3);
    if (t.description) {
      const p = document.createElement('p');
      p.textContent = t.description.trim();
      textCell.push(p);
    }
    if (t.minutes && labels.readTimeLabel) {
      const p = document.createElement('p');
      p.textContent = `${t.minutes} ${labels.readTimeLabel}`;
      textCell.push(p);
    }
    cells.push([imageCell, textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article-filter', cells });
  element.replaceWith(block);
}
