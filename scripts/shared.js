import { getMetadata } from './aem.js';

/**
 * Locale config: maps URL prefix to locale metadata.
 * Root locale uses empty string key.
 * Add or remove entries to match the site's language support.
 */
export const LOCALES = {
  '': { lang: 'en' },
  '/de': { lang: 'de' },
  '/es': { lang: 'es' },
  '/fr': { lang: 'fr' },
  '/ja': { lang: 'ja' },
  '/zh': { lang: 'zh' },
  '/hi': { lang: 'hi' }
};

/**
 * Detect the current locale from the URL pathname and apply its lang to <html>.
 * @param {Object} [locales] - Locale map (defaults to LOCALES)
 * @returns {{ prefix: string, lang: string }}
 */
export function getLocale(locales = LOCALES) {
  const { pathname } = window.location;
  const matches = Object.keys(locales).filter(
    (prefix) => prefix !== '' && pathname.startsWith(`${prefix}/`),
  );
  const prefix = matches.sort((a, b) => b.length - a.length)[0] || '';
  const locale = locales[prefix] || locales[''];

  document.documentElement.lang = locale?.lang || 'en';
  return { prefix, ...locale };
}

/**
 * Page metadata `gated=true` — same signal as CDN worker HTML gating; author preview uses this too.
 * @returns {boolean}
 */
export function isGatedPage() {
  return String(getMetadata('gated') || '').trim().toLowerCase() === 'true';
}

/**
 * Create an element with attributes and optional content.
 * @param {string} tag - Tag name
 * @param {Record<string, string>} attributes - Attribute key-value pairs
 * @param {Element|Element[]|string|null} [content] - Child elements or text
 * @returns {Element}
 */

export function createTag(tag, attributes = {}, content = null) {
  const el = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    el.setAttribute(key, String(value));
  });

  if (content !== null && content !== undefined) {
    if (Array.isArray(content)) {
      content.forEach((item) => {
        if (item != null) el.append(item);
      });
    } else {
      el.append(content);
    }
  }

  return el;
}

/**
 * Format a date value for display.
 * @param {string|number} dateValue - Date string or timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(dateValue) {
  if (!dateValue) return '';
  const normalized = String(dateValue).trim();
  if (!normalized) return '';

  let date;
  if (/^[0-9]+$/.test(normalized)) {
    const ts = Number(normalized);
    date = new Date(ts < 1e12 ? ts * 1000 : ts);
  } else {
    date = new Date(normalized);
  }

  if (Number.isNaN(date.getTime())) return normalized;

  const formattedDateString = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return formattedDateString;
}

/**
 * Normalize path (ensure leading slash).
 * @param {string} path - Path string
 * @returns {string}
 */
export function normalizePath(path = '') {
  if (!path) return '#';
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Parse comma-separated keywords into array.
 * @param {string} raw - Raw string
 * @returns {string[]}
 */
export function parseKeywords(raw = '') {
  return String(raw)
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Get keywords from article object.
 * @param {Object} article - Article data
 * @returns {string}
 */
export function getArticleKeywords(article = {}) {
  return String(article.keywords || '');
}

/**
 * Get content timestamp from entry.
 * @param {Object} entry - Content entry
 * @returns {number}
 */
export function getContentTimestamp(entry = {}) {
  const value = entry.lastModified || entry.date || entry.publisheddate;
  if (!value) return 0;
  if (/^[0-9]+$/.test(String(value))) return Number(value);
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Default page size for query-index pagination */
export const QUERY_INDEX_PAGE_SIZE = 500;

/**
 * Fetch a page of query-index.
 * @param {number} offset - Offset
 * @param {number} limit - Limit
 * @param {string} [baseUrl=''] - Base URL
 * @returns {Promise<Array>}
 */
export async function fetchQueryIndexPage(offset, limit, baseUrl = '') {
  const path = `/query-index.json?offset=${offset}&limit=${limit}`;
  const url = baseUrl ? `${String(baseUrl).replace(/\/+$/, '')}${path}` : path;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Query index request failed: ${resp.status}`);
  const json = await resp.json();
  return json?.data || [];
}

/**
 * Fetch all rows from query-index by paginating.
 * @param {{ pageSize?: number, baseUrl?: string }} [options]
 * @returns {Promise<Array>}
 */
export async function fetchQueryIndexAll(options = {}) {
  const { pageSize = QUERY_INDEX_PAGE_SIZE, baseUrl = '' } = options;

  async function fetchPage(offset, acc) {
    const rows = await fetchQueryIndexPage(offset, pageSize, baseUrl);
    if (!rows.length) return acc;
    const next = [...acc, ...rows];
    return rows.length === pageSize ? fetchPage(offset + rows.length, next) : next;
  }

  return fetchPage(0, []);
}

/**
 * Normalize URL or path to canonical path (no trailing slash).
 * @param {string} href - URL or path
 * @param {string} [base] - Base URL
 * @returns {string}
 */
export function pathFromHref(href, base = typeof window !== 'undefined' ? window.location.origin : '') {
  try {
    const u = new URL(href, base);
    return u.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return '';
  }
}

/**
 * Get authored link paths from block (list of a[href] → { path, title }).
 * Skips when block has config-style rows (2+ cells).
 * @param {Element} block - Block element
 * @returns {Array<{ path: string, title: string }>}
 */
export function getAuthoredLinks(block) {
  const rows = block.querySelectorAll(':scope > div');
  const hasConfigRows = [...rows].some((row) => row.children.length >= 2);
  if (hasConfigRows) return [];

  const anchors = block.querySelectorAll('a[href]');
  if (!anchors.length) return [];

  return [...anchors].map((a) => {
    const path = pathFromHref(a.href);
    const rawTitle = (a.textContent || '').trim();
    const looksLikeUrl = /^https?:\/\//i.test(rawTitle) || rawTitle.length > 80;
    const title = looksLikeUrl ? '' : rawTitle;
    return { path, title };
  }).filter((item) => item.path && item.path !== '/');
}

/**
 * Resolve authored links with metadata from query index.
 * @param {Array<{ path: string, title: string }>} authoredLinks
 * @param {Array} indexRows - Query index data
 * @returns {Array<{ path, title, description, date? }>}
 */
export function resolveArticlesFromIndex(authoredLinks, indexRows) {
  return authoredLinks.map(({ path, title: linkTitle }) => {
    const norm = normalizePath(path);
    const row = indexRows.find((r) => r?.path && normalizePath(r.path) === norm);
    const fallbackTitle = norm.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || norm;
    const img = row?.image?.trim() || '';

    return {
      path: norm,
      title: row?.title?.trim() || linkTitle || fallbackTitle,
      description: row?.description?.trim() || '',
      image: img.includes('default-meta-image.png') ? '' : img,
      date: row?.date || row?.publisheddate || row?.lastModified,
    };
  });
}

/**
 * Shuffle array (Fisher–Yates). Returns new array.
 * @param {Array} arr - Input array
 * @returns {Array}
 */
export function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

// ---------------------------------------------------------------------------
// Chart.js (delayed load for CWV; reuse across calculators)
// ---------------------------------------------------------------------------

const CHART_JS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
let chartJsLoadPromise = null;

/**
 * Load Chart.js from CDN in a deferred way (after idle) so it does not affect LCP/CWV.
 * @returns {Promise<typeof window.Chart>}
 */
export function loadChartJs() {
  if (typeof window.Chart !== 'undefined') return Promise.resolve(window.Chart);
  if (chartJsLoadPromise) return chartJsLoadPromise;
  chartJsLoadPromise = new Promise((resolve, reject) => {
    const run = () => {
      const script = document.createElement('script');
      script.src = CHART_JS_CDN;
      script.async = true;
      script.onload = () => resolve(window.Chart);
      script.onerror = () => reject(new Error('Chart.js failed to load'));
      document.head.append(script);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 1);
    }
  });
  return chartJsLoadPromise;
}

/**
 * Create or replace a Chart.js instance on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} config - Chart.js config (type, data, options)
 * @returns {Object|undefined}
 */
export function createChart(canvas, config) {
  if (!canvas || !config) return undefined;
  const ChartLib = window.Chart;
  if (!ChartLib) return undefined;
  if (canvas.chart) {
    canvas.chart.destroy();
    canvas.chart = null;
  }
  const chart = new ChartLib(canvas, config);
  canvas.chart = chart;
  return chart;
}

/**
 * Returns all metadata properties matching a given scope/prefix.
 * Looks for `<meta property="{scope}:…">` and `<meta name="{scope}-…">`.
 * @param {string} scope The metadata prefix (e.g. 'campaign', 'audience')
 * @param {Document} [doc=document] Document to query
 * @returns {Record<string, string>} Key-value pairs of matching metadata (keys in camelCase)
 */
export function getAllMetadata(scope, doc = document) {
  const result = {};
  const meta = [...doc.head.querySelectorAll(`meta[property^="${scope}:"], meta[name^="${scope}-"]`)];
  meta.forEach((m) => {
    const key = m.getAttribute('property')
      ? m.getAttribute('property').replace(`${scope}:`, '')
      : m.getAttribute('name').replace(`${scope}-`, '');
    result[key.replace(/[-:]([a-z])/g, (g) => g[1].toUpperCase())] = m.content;
  });
  return result;
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  [...from.attributes]
    .map(({ nodeName }) => nodeName)
    .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-'))
    .forEach((attr) => {
      const value = from.getAttribute(attr);
      if (value) {
        to.setAttribute(attr, value);
        from.removeAttribute(attr);
      }
    });
}

/**
 * Resolve DOM context for a block element.
 * Returns the correct body and event root whether the block runs
 * in the normal document or inside a shadow DOM (aem-embed).
 * @param {Element} block
 * @returns {{ root: Document|ShadowRoot, body: HTMLElement, eventRoot: Document|ShadowRoot, isEmbed: boolean }}
 */
export function getBlockContext(block) {
  const root = block.getRootNode();
  const isEmbed = root !== document;
  return {
    root,
    body: isEmbed ? root.querySelector('body') : document.body,
    eventRoot: isEmbed ? root : document,
    isEmbed,
  };
}

// ---------------------------------------------------------------------------
// Newsletter sign-up form (footer dialog + newsletter block)
// ---------------------------------------------------------------------------

/*
 * Newsletter form fields, in the order of the authored field list.
 * Names are the subscription service's field identifiers (not user-facing copy).
 */
const SIGNUP_FIELDS = [
  { name: 'EMAIL', type: 'email', required: true },
  { name: 'FNAME', type: 'text', required: true, pattern: '[^0-9]+' },
  { name: 'COUNTRY', type: 'select', required: true },
  { name: 'MERGE9', type: 'checkbox', value: 'Yes' },
  { name: 'first-consent', type: 'checkbox', required: true, value: 'first-consent' },
];

/** Element helper for boolean attributes (true -> empty attribute, false/null -> omitted). */
function signupEl(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c) node.append(c);
  });
  return node;
}

let signupIdCounter = 0;

/** Label content of a list item, without its nested list. */
function signupItemLabel(li) {
  const frag = document.createDocumentFragment();
  [...li.childNodes].filter((n) => n.tagName !== 'UL').forEach((n) => frag.append(n.cloneNode(true)));
  return frag;
}

function buildSignupField(field, li, messages, prefix) {
  signupIdCounter += 1;
  const id = `${prefix}-${signupIdCounter}`;
  const subItems = [...li.querySelectorAll(':scope > ul > li')].map((s) => s.textContent.trim());
  const wrapper = signupEl('div', { class: `${prefix}-field ${prefix}-${field.type}` });

  if (field.type === 'checkbox') {
    const input = signupEl('input', {
      type: 'checkbox', id, name: field.name, value: field.value, required: field.required,
    });
    input.addEventListener('invalid', () => {
      if (messages.required) input.setCustomValidity(messages.required);
    });
    input.addEventListener('change', () => input.setCustomValidity(''));
    wrapper.append(input, signupEl('label', { for: id }, signupItemLabel(li)));
    return wrapper;
  }

  let input;
  if (field.type === 'select') {
    const [placeholder, ...options] = subItems;
    input = signupEl('select', { id, name: field.name, required: field.required }, [
      signupEl('option', { value: '', disabled: true, selected: true }, placeholder),
      ...options.map((o) => signupEl('option', { value: o }, o)),
    ]);
  } else {
    const [placeholder, invalidMessage] = subItems;
    input = signupEl('input', {
      type: field.type, id, name: field.name, placeholder, pattern: field.pattern, required: field.required,
    });
    if (invalidMessage) input.dataset.invalidMessage = invalidMessage;
  }
  // custom validation messages from the authored content
  input.addEventListener('invalid', () => {
    const { validity } = input;
    if (validity.valueMissing && messages.required) input.setCustomValidity(messages.required);
    else if ((validity.typeMismatch || validity.patternMismatch) && input.dataset.invalidMessage) {
      input.setCustomValidity(input.dataset.invalidMessage);
    }
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
  wrapper.append(signupEl('label', { for: id }, signupItemLabel(li)), input);
  return wrapper;
}

/**
 * Builds the newsletter sign-up form from authored content:
 *   elements before the list -> intro (returned as-is)
 *   bulleted list            -> fields (email, first name, country, local newsletter, consent)
 *   then paragraphs with a link: submit (href = endpoint, text = label), success link (optional)
 *   and plain paragraphs: required-field message, success message, close label (optional)
 * Submitting posts the fields as form data; on success the form is hidden and the success panel
 * is shown, on failure the submit button is re-enabled.
 * @param {Element[]} nodes authored elements (section or block cell children)
 * @param {{ classPrefix?: string }} [options] prefix of all generated class names and ids
 * @returns {{ intro: Element[], form: HTMLFormElement|null, success: HTMLElement|null,
 *   closeLabel: string|undefined }} form and success are null when there is no field list
 */
export function buildSignupForm(nodes, { classPrefix = 'signup' } = {}) {
  const listIndex = nodes.findIndex((c) => c.tagName === 'UL');
  if (listIndex < 0) {
    return {
      intro: nodes, form: null, success: null, closeLabel: undefined,
    };
  }
  const intro = nodes.slice(0, listIndex);
  const after = nodes.slice(listIndex + 1).filter((n) => n.tagName === 'P');
  const [submitLink, successLink] = after.filter((p) => p.querySelector('a')).map((p) => p.querySelector('a'));
  const [requiredMessage, successMessage, closeLabel] = after
    .filter((p) => !p.querySelector('a')).map((p) => p.textContent.trim());

  const form = signupEl('form', { class: `${classPrefix}-form`, method: 'post', action: submitLink?.href });
  const fields = [...nodes[listIndex].children].map((li, i) => SIGNUP_FIELDS[i]
    && buildSignupField(SIGNUP_FIELDS[i], li, { required: requiredMessage }, classPrefix))
    .filter(Boolean);
  const submit = signupEl('button', { type: 'submit', class: `button secondary ${classPrefix}-submit` }, submitLink?.textContent.trim());
  form.append(...fields, signupEl('p', { class: 'button-container' }, submit));

  const success = signupEl('div', { class: `${classPrefix}-success`, hidden: true }, [
    signupEl('p', {}, successMessage),
    successLink && signupEl('p', { class: 'button-container' }, signupEl('a', { class: 'button secondary', href: successLink.href }, successLink.textContent.trim())),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    try {
      const resp = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      if (!resp.ok) throw new Error(resp.status);
      form.hidden = true;
      success.hidden = false;
    } catch (err) {
      submit.disabled = false;
    }
  });

  return {
    intro, form, success, closeLabel,
  };
}

// ---------------------------------------------------------------------------
// Video embeds (cards-video, columns-media, carousel-video)
// ---------------------------------------------------------------------------

const VIDEO_FILE = /\.(mp4|webm|m3u8|mov)(\?|#|$)/i;

/**
 * Resolves an authored video link to an embeddable source.
 * Supports YouTube, Vimeo, the Novo Nordisk video platform
 * (*.videomarketingplatform.co/<id>.thtml), Dynamic Media (/is/content/) and video files.
 * @param {string} href Link URL
 * @param {{ autoplay?: boolean }} [options]
 * @returns {{ type: 'iframe'|'video', src: string }|null}
 */
export function getVideoEmbed(href, { autoplay = false } = {}) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const id = host === 'youtu.be' ? url.pathname.slice(1) : (url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop());
    if (!id) return null;
    return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? '&autoplay=1' : ''}` };
  }
  if (host.endsWith('vimeo.com')) {
    const id = url.pathname.split('/').filter(Boolean).pop();
    if (!id) return null;
    return { type: 'iframe', src: `https://player.vimeo.com/video/${id}${autoplay ? '?autoplay=1' : ''}` };
  }
  if (host.endsWith('videomarketingplatform.co') && /\.[a-z]?html$/.test(url.pathname)) {
    if (autoplay) url.searchParams.set('autoPlay', '1');
    return { type: 'iframe', src: url.href };
  }
  if (VIDEO_FILE.test(url.pathname) || url.pathname.includes('/is/content/')) {
    return { type: 'video', src: url.href };
  }
  return null;
}

/**
 * Creates the player element for an embed returned by getVideoEmbed.
 * @param {{ type: string, src: string }} embed
 * @param {{ title?: string, autoplay?: boolean, poster?: string }} [options]
 * @returns {HTMLIFrameElement|HTMLVideoElement}
 */
export function createVideoPlayer(embed, { title = '', autoplay = false, poster } = {}) {
  if (embed.type === 'iframe') {
    return createTag('iframe', {
      src: embed.src,
      title: title || null,
      allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
      loading: 'lazy',
    });
  }
  const video = createTag('video', {
    src: embed.src,
    controls: '',
    playsinline: '',
    preload: poster ? 'none' : 'metadata',
    poster: poster || null,
    'aria-label': title || null,
  });
  if (autoplay) video.autoplay = true;
  return video;
}
