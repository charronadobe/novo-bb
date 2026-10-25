/*
 * Header block
 * Reads the nav fragment (content/nav.plain.html) and builds the header:
 *   section 1  brand (logo link) + optional text used as the mobile menu button label
 *   section 2  main navigation: <ul> of links, or labelled items with nested
 *              <ul> columns (column = optional heading <p> + <ul> of links or image cards)
 *   section 3+ tools: an icon (:name: + label) or image toggle + list panel (e.g. country list),
 *              an icon or image toggle + search (label <p> + link to the search page),
 *              or plain links (CTA buttons)
 * All copy and URLs come from the fragment; this file only adds structure and behavior.
 */

const DESKTOP = window.matchMedia('(min-width: 1200px)');
const HOVER_CLOSE_DELAY = 150;

/**
 * Fetches the nav fragment: /content first (local preview), then the site root (DA/EDS).
 * @returns {Promise<Element|null>} wrapper element containing the fragment sections
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
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
    if (v !== undefined && v !== null) node.setAttribute(k, v);
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

/* ---------- open / close state ---------- */

function closeAll(nav, except) {
  nav.querySelectorAll('[aria-expanded="true"][aria-controls]').forEach((btn) => {
    if (btn === except || btn.classList.contains('nav-hamburger')) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.closest('.nav-item, .nav-tool')?.classList.remove('is-open');
  });
}

function setOpen(nav, btn, open) {
  if (open) closeAll(nav, btn);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.closest('.nav-item, .nav-tool')?.classList.toggle('is-open', open);
}

/* ---------- main navigation ---------- */

function buildPanelColumn(colLi) {
  const column = el('div', { class: 'nav-panel-column' });
  const heading = colLi.querySelector(':scope > p');
  if (heading) column.append(el('p', { class: 'nav-panel-heading' }, heading.textContent.trim()));
  const list = colLi.querySelector(':scope > ul');
  if (list) {
    const ul = el('ul', { class: 'nav-panel-links' });
    [...list.children].forEach((li) => {
      const img = li.querySelector('img');
      const link = li.querySelector('a');
      if (!link) return;
      const item = el('li');
      if (img) {
        // image card: thumbnail + link text, the whole card is one link
        item.className = 'nav-panel-card';
        const a = el('a', { href: link.href }, [
          el('span', { class: 'nav-panel-card-image' }, img.cloneNode(true)),
          el('span', { class: 'nav-panel-card-text' }, link.textContent.trim()),
        ]);
        item.append(a);
        column.classList.add('has-cards');
      } else {
        item.append(el('a', { href: link.href }, link.textContent.trim()));
      }
      ul.append(item);
    });
    column.append(ul);
  }
  return column;
}

function buildNavItem(li, nav) {
  const item = el('li', { class: 'nav-item' });
  const directLink = li.querySelector(':scope > a');
  const sub = li.querySelector(':scope > ul');
  if (directLink && !sub) {
    item.append(el('a', { class: 'nav-link', href: directLink.href }, directLink.textContent.trim()));
    return item;
  }

  const label = (li.querySelector(':scope > p') || directLink)?.textContent.trim() || '';
  const panelId = uid('nav-panel');
  const trigger = el('button', {
    type: 'button', class: 'nav-link nav-trigger', 'aria-expanded': 'false', 'aria-controls': panelId,
  }, el('span', {}, label));
  const columns = [...(sub?.children || [])].map(buildPanelColumn);
  const panel = el('div', { class: 'nav-panel', id: panelId }, el('div', { class: 'nav-panel-inner' }, columns));
  if (columns.some((c) => c.classList.contains('has-cards'))) panel.classList.add('has-cards');
  item.classList.add('has-panel');
  item.append(trigger, panel);

  trigger.addEventListener('click', () => {
    setOpen(nav, trigger, trigger.getAttribute('aria-expanded') !== 'true');
  });

  // desktop: open on hover, close shortly after the pointer leaves trigger + panel
  let closeTimer;
  item.addEventListener('mouseenter', () => {
    if (!DESKTOP.matches) return;
    clearTimeout(closeTimer);
    setOpen(nav, trigger, true);
  });
  item.addEventListener('mouseleave', () => {
    if (!DESKTOP.matches) return;
    closeTimer = setTimeout(() => setOpen(nav, trigger, false), HOVER_CLOSE_DELAY);
  });
  return item;
}

function buildSections(section, nav) {
  const ul = el('ul', { class: 'nav-sections nav-list' });
  const list = section?.querySelector(':scope > ul');
  if (list) [...list.children].forEach((li) => ul.append(buildNavItem(li, nav)));
  return ul;
}

/* ---------- tools ---------- */

function buildListPanel(list) {
  const ul = el('ul', { class: 'nav-tool-list' });
  [...list.children].forEach((li) => {
    const title = li.querySelector(':scope > p');
    const links = [...li.querySelectorAll('a')];
    const entry = el('li', { class: 'nav-tool-entry' });
    if (title) entry.append(el('p', { class: 'nav-tool-entry-title' }, title.textContent.trim()));
    if (links.length) {
      entry.append(el('ul', {}, links.map((a) => el('li', {}, el('a', { href: a.href }, a.textContent.trim())))));
    }
    ul.append(entry);
  });
  return ul;
}

function buildSearchForm(labelText, link) {
  const inputId = uid('nav-search-input');
  const url = new URL(link.href);
  return el('form', {
    class: 'nav-search-form', role: 'search', method: 'get', action: url.pathname,
  }, [
    el('label', { class: 'nav-visually-hidden', for: inputId }, labelText),
    el('input', { id: inputId, type: 'text', name: 'q' }),
    el('button', { type: 'submit', class: 'nav-search-submit' }, link.textContent.trim()),
  ]);
}

const ICON_TOKEN = /^:([a-z0-9-]+):\s*(.*)$/i;

/**
 * Finds the toggle of a tool section: a paragraph with an icon (`:name:` followed by the
 * accessible label, rendered as span.icon by the content pipeline) or with an image.
 * @returns {{p: Element, icon: Element, label: string}|null}
 */
function findToggle(section) {
  const paragraphs = [...section.querySelectorAll(':scope > p')];
  for (const p of paragraphs) {
    const iconSpan = p.querySelector('span.icon');
    const token = p.textContent.trim().match(ICON_TOKEN);
    const name = iconSpan
      ? [...iconSpan.classList].find((c) => c.startsWith('icon-'))?.slice(5)
      : token?.[1];
    if (name) {
      const icon = el('img', { src: `${window.hlx?.codeBasePath || ''}/icons/${name}.svg`, alt: '' });
      const label = iconSpan ? p.textContent.trim() : token[2];
      return { p, icon, label };
    }
    const img = p.querySelector('img');
    if (img && !p.querySelector('a')) {
      const icon = img.cloneNode(true);
      icon.alt = '';
      return { p, icon, label: img.alt };
    }
  }
  return null;
}

function buildTool(section, nav) {
  const found = findToggle(section);
  const list = section.querySelector('ul');
  const links = [...section.querySelectorAll('a')];

  // no toggle icon: plain links (CTA)
  if (!found) {
    const tool = el('div', { class: 'nav-tool nav-tool-links' });
    links.forEach((a) => tool.append(el('a', { class: 'button', href: a.href }, a.textContent.trim())));
    return tool;
  }

  const panelId = uid('nav-tool-panel');
  const toggle = el('button', {
    type: 'button', class: 'nav-tool-toggle', 'aria-expanded': 'false', 'aria-controls': panelId, 'aria-label': found.label,
  }, found.icon);
  const panel = el('div', { class: 'nav-tool-panel', id: panelId });
  const tool = el('div', { class: 'nav-tool' }, [toggle, panel]);

  if (list) {
    tool.classList.add('nav-tool-list-panel');
    panel.append(buildListPanel(list));
  } else if (links.length) {
    tool.classList.add('nav-tool-search');
    const label = [...section.querySelectorAll(':scope > p')]
      .find((p) => p !== found.p && !p.querySelector('img, a'));
    panel.append(buildSearchForm(label?.textContent.trim() || found.label, links[0]));
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(nav, toggle, open);
    if (open) panel.querySelector('input')?.focus();
  });
  return tool;
}

/* ---------- mobile menu ---------- */

function toggleMenu(nav, hamburger, open) {
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  nav.classList.toggle('is-menu-open', open);
  if (!open) closeAll(nav);
}

function buildHamburger(nav, label, menuId) {
  const hamburger = el('button', {
    type: 'button', class: 'nav-hamburger', 'aria-expanded': 'false', 'aria-controls': menuId, 'aria-label': label,
  }, [el('span'), el('span'), el('span')]);
  hamburger.addEventListener('click', () => {
    toggleMenu(nav, hamburger, hamburger.getAttribute('aria-expanded') !== 'true');
  });
  return hamburger;
}

/* ---------- decorate ---------- */

export default async function decorate(block) {
  const fragment = await fetchNav();
  if (!fragment) return;
  const sections = [...fragment.children].filter((c) => c.tagName === 'DIV');
  const [brandSection, navSection, ...toolSections] = sections;

  const nav = el('nav', { id: 'nav', class: 'nav' });

  const brand = el('div', { class: 'nav-brand' });
  const brandLink = brandSection?.querySelector('a');
  if (brandLink) {
    const logo = brandLink.querySelector('img');
    brand.append(el('a', { href: brandLink.getAttribute('href') }, logo ? logo.cloneNode(true) : brandLink.textContent.trim()));
  }

  const navSections = buildSections(navSection, nav);
  navSections.id = 'nav-menu';
  const tools = el('div', { class: 'nav-tools' }, toolSections.map((s) => buildTool(s, nav)));

  // mobile: the CTA links are repeated at the top of the menu list (hidden on desktop)
  const ctaLinks = tools.querySelectorAll('.nav-tool-links a');
  if (ctaLinks.length) {
    navSections.prepend(el('li', { class: 'nav-item nav-item-cta' }, [...ctaLinks].map((a) => a.cloneNode(true))));
  }

  const menuLabel = [...(brandSection?.querySelectorAll(':scope > p') || [])]
    .find((p) => !p.querySelector('a, img'))?.textContent.trim();
  const hamburger = buildHamburger(nav, menuLabel, navSections.id);

  nav.append(brand, navSections, tools, hamburger);

  // close panels on outside click and Escape
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAll(nav);
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = nav.querySelector('[aria-expanded="true"][aria-controls]:not(.nav-hamburger)');
    if (open) {
      closeAll(nav);
      open.focus();
    } else if (hamburger.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, hamburger, false);
      hamburger.focus();
    }
  });
  // reset open panels and the mobile menu when crossing the desktop breakpoint
  DESKTOP.addEventListener('change', () => toggleMenu(nav, hamburger, false));

  const navWrapper = el('div', { class: 'nav-wrapper' }, nav);
  block.replaceChildren(navWrapper);
}
