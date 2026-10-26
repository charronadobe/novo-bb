/*
 * Footer block
 * Reads the footer fragment (content/footer.plain.html) and renders its sections in order:
 *   a section with only an image          -> brand logo
 *   a section with a list of links        -> link row
 *   a section with a heading + plain list -> exit notice dialog, shown when a visitor follows a
 *                                            link to another site that is not in the list
 *   a section with a nested list          -> newsletter sign-up dialog, opened by any #newsletter link
 *   other sections                        -> legal / copyright text
 * All copy, links, images and lists come from the fragment; this file only adds structure and
 * behavior. See README.md for the authoring structure of the dialog sections.
 */

import { buildSignupForm } from '../../scripts/shared.js';

const NEWSLETTER_HASH = '#newsletter';

/**
 * Fetches the footer fragment: /content first (local preview), then the site root (DA/EDS).
 * @returns {Promise<Element|null>} wrapper element containing the fragment sections
 */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = await resp.text();
  // image paths in the fragment are relative to the fragment location
  const base = new URL(resp.url);
  wrapper.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  return wrapper;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c) node.append(c);
  });
  return node;
}

let idCounter = 0;
const uid = (prefix) => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

function sectionType(section) {
  const list = section.querySelector(':scope > ul');
  if (section.querySelector('h1, h2, h3, h4') && list && !list.querySelector('a')) return 'exit-notice';
  if (list?.querySelector('li > ul')) return 'signup';
  if (list?.querySelector('a')) return 'links';
  if (section.querySelector('img') && !section.textContent.trim()) return 'brand';
  return 'legal';
}

const isExternal = (url) => /^https?:$/.test(url.protocol) && url.hostname !== window.location.hostname;
const bareHost = (host) => host.toLowerCase().replace(/^www\./, '');

/** Links to another site open in a new tab. */
function decorateLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    if (isExternal(new URL(a.href))) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });
}

/* ---------- dialogs ---------- */

function buildDialog(className, closeLabel, content) {
  const close = el('button', { type: 'button', class: 'footer-dialog-close', 'aria-label': closeLabel });
  const dialog = el('dialog', { class: `footer-dialog ${className}` }, [close, ...content]);
  close.addEventListener('click', () => dialog.close());
  // a click on the backdrop (outside the dialog box) closes it
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  return dialog;
}

const plainParagraphs = (nodes) => nodes.filter((n) => n.tagName === 'P' && !n.querySelector('a'));
const linkParagraphs = (nodes) => nodes.filter((n) => n.tagName === 'P' && n.querySelector('a'));

function buildExitNotice(section) {
  const children = [...section.children];
  const heading = section.querySelector('h1, h2, h3, h4');
  const [body, closeLabel] = plainParagraphs(children);
  const action = linkParagraphs(children)[0]?.querySelector('a');
  const allowed = [...section.querySelectorAll(':scope > ul > li')].map((li) => bareHost(li.textContent.trim()));

  const titleId = uid('footer-dialog-title');
  if (heading) heading.id = titleId;
  const leave = el('a', { class: 'button primary footer-dialog-action', href: action?.href || '#' }, action?.textContent.trim());
  const dialog = buildDialog('footer-exit-notice', closeLabel?.textContent.trim(), [
    el('div', { class: 'footer-dialog-body' }, [heading, body, el('p', { class: 'button-container' }, leave)]),
  ]);
  dialog.setAttribute('aria-labelledby', titleId);

  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href]');
    if (!link || dialog.contains(link) || e.defaultPrevented) return;
    const url = new URL(link.href);
    if (!isExternal(url) || allowed.includes(bareHost(url.hostname))) return;
    e.preventDefault();
    leave.href = url.href;
    if (link.target) leave.target = link.target;
    else leave.removeAttribute('target');
    dialog.showModal();
  });
  leave.addEventListener('click', () => dialog.close());
  return dialog;
}

function buildSignup(section) {
  const {
    intro, form, success, closeLabel,
  } = buildSignupForm([...section.children], { classPrefix: 'footer-signup' });
  const introParagraphs = intro.filter((c) => c.tagName === 'P');
  const panel = el('div', { class: 'footer-dialog-body footer-signup' }, [
    el('div', { class: 'footer-signup-intro' }, introParagraphs), form, success,
  ]);
  const dialog = buildDialog('footer-signup-dialog', closeLabel, [panel]);
  dialog.setAttribute('aria-label', introParagraphs[0]?.textContent.trim() || '');

  const open = () => {
    if (!dialog.open) dialog.showModal();
  };
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.(`a[href$="${NEWSLETTER_HASH}"]`);
    if (!link) return;
    e.preventDefault();
    open();
  });
  if (window.location.hash === NEWSLETTER_HASH) open();
  return dialog;
}

/* ---------- decorate ---------- */

export default async function decorate(block) {
  const fragment = await fetchFooter();
  if (!fragment) return;
  const sections = [...fragment.children].filter((c) => c.tagName === 'DIV');

  const inner = el('div', { class: 'footer-inner' });
  const dialogs = [];
  sections.forEach((section) => {
    const type = sectionType(section);
    if (type === 'exit-notice') {
      dialogs.push(buildExitNotice(section));
    } else if (type === 'signup') {
      dialogs.push(buildSignup(section));
    } else {
      const wrapper = el(type === 'links' ? 'nav' : 'div', { class: `footer-${type}` });
      wrapper.append(...section.childNodes);
      inner.append(wrapper);
    }
  });

  decorateLinks(inner);
  block.replaceChildren(inner, ...dialogs);
}
