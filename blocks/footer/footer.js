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

const NEWSLETTER_HASH = '#newsletter';

/*
 * Newsletter form fields, in the order of the field list in the fragment.
 * Names are the subscription service's field identifiers (not user-facing copy).
 */
const SIGNUP_FIELDS = [
  { name: 'EMAIL', type: 'email', required: true },
  { name: 'FNAME', type: 'text', required: true, pattern: '[^0-9]+' },
  { name: 'COUNTRY', type: 'select', required: true },
  { name: 'MERGE9', type: 'checkbox', value: 'Yes' },
  { name: 'first-consent', type: 'checkbox', required: true, value: 'first-consent' },
];

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

/** Label content of a list item, without its nested list. */
function itemLabel(li) {
  const nodes = [...li.childNodes].filter((n) => n.tagName !== 'UL');
  const frag = document.createDocumentFragment();
  nodes.forEach((n) => frag.append(n.cloneNode(true)));
  return frag;
}

function buildField(field, li, messages) {
  const id = uid('footer-signup');
  const subItems = [...li.querySelectorAll(':scope > ul > li')].map((s) => s.textContent.trim());
  const wrapper = el('div', { class: `footer-signup-field footer-signup-${field.type}` });

  if (field.type === 'checkbox') {
    const input = el('input', {
      type: 'checkbox', id, name: field.name, value: field.value, required: field.required,
    });
    input.addEventListener('invalid', () => {
      if (messages.required) input.setCustomValidity(messages.required);
    });
    input.addEventListener('change', () => input.setCustomValidity(''));
    wrapper.append(input, el('label', { for: id }, itemLabel(li)));
    return { wrapper, input };
  }

  let input;
  if (field.type === 'select') {
    const [placeholder, ...options] = subItems;
    input = el('select', { id, name: field.name, required: field.required }, [
      el('option', { value: '', disabled: true, selected: true }, placeholder),
      ...options.map((o) => el('option', { value: o }, o)),
    ]);
  } else {
    const [placeholder, invalidMessage] = subItems;
    input = el('input', {
      type: field.type, id, name: field.name, placeholder, pattern: field.pattern, required: field.required,
    });
    if (invalidMessage) input.dataset.invalidMessage = invalidMessage;
  }
  // custom validation messages from the fragment
  input.addEventListener('invalid', () => {
    const { validity } = input;
    if (validity.valueMissing && messages.required) input.setCustomValidity(messages.required);
    else if ((validity.typeMismatch || validity.patternMismatch) && input.dataset.invalidMessage) {
      input.setCustomValidity(input.dataset.invalidMessage);
    }
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
  wrapper.append(el('label', { for: id }, itemLabel(li)), input);
  return { wrapper, input };
}

function buildSignup(section) {
  const children = [...section.children];
  const listIndex = children.findIndex((c) => c.tagName === 'UL');
  const intro = children.slice(0, listIndex).filter((c) => c.tagName === 'P');
  const after = children.slice(listIndex + 1);
  const [submitLink, successLink] = linkParagraphs(after).map((p) => p.querySelector('a'));
  const [requiredMessage, successMessage, closeLabel] = plainParagraphs(after).map((p) => p.textContent.trim());

  const form = el('form', {
    class: 'footer-signup-form', method: 'post', action: submitLink?.href, novalidate: false,
  });
  const fields = [...children[listIndex].children].map((li, i) => SIGNUP_FIELDS[i]
    && buildField(SIGNUP_FIELDS[i], li, { required: requiredMessage })).filter(Boolean);
  const submit = el('button', { type: 'submit', class: 'button secondary footer-signup-submit' }, submitLink?.textContent.trim());
  form.append(...fields.map((f) => f.wrapper), el('p', { class: 'button-container' }, submit));

  const success = el('div', { class: 'footer-signup-success', hidden: true }, [
    el('p', {}, successMessage),
    successLink && el('p', { class: 'button-container' }, el('a', { class: 'button secondary', href: successLink.href }, successLink.textContent.trim())),
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

  const panel = el('div', { class: 'footer-dialog-body footer-signup' }, [
    el('div', { class: 'footer-signup-intro' }, intro), form, success,
  ]);
  const dialog = buildDialog('footer-signup-dialog', closeLabel, [panel]);
  dialog.setAttribute('aria-label', intro[0]?.textContent.trim() || '');

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
