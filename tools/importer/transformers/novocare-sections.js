/* eslint-disable */
/* global WebImporter */

/**
 * Section transformer for global.novocare.com.
 *
 * beforeTransform: locates each template section (selectors tried in order),
 * tags the section element, and inserts an <hr> section break before every
 * non-first section while parser targets still exist. Selectors use :has(),
 * which may stop matching once parsers replace inner content, so elements are
 * tagged here and found again by attribute in afterTransform.
 *
 * Nested sections: section-8 (section.section-container--xlarge) wraps an inner
 * section.section-container. Only the outermost matching element is used, and
 * elements already claimed by another template section are skipped, so each
 * template section yields exactly one EDS section.
 *
 * afterTransform: appends Section Metadata (style) for styled sections and
 * removes temporary markers.
 */

const SECTION_ATTR = 'data-excat-section-el';
const MARKER_ATTR = 'data-excat-section-id';

function findSectionElement(document, section, claimed) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (const sel of selectors) {
    if (!sel) continue;
    let matches = [];
    try {
      matches = [...document.querySelectorAll(sel)];
    } catch (e) {
      continue;
    }
    // prefer outermost match not already claimed by another section
    const el = matches.find((m) => !claimed.some((c) => c === m || c.contains(m) || m.contains(c)));
    if (el) return el;
  }
  return null;
}

/*
 * Auto mode (template.autoSections = { selector, styles }): used by templates whose
 * pages are composed freely (landing, guide). Every outermost element matching
 * `selector` becomes a section; a section whose container only holds layout
 * wrappers is split into those wrappers (recursively), so nested background
 * groups become their own sections. `styles` maps a class-name regex to a
 * section style; a section whose first title is centred also gets "centered".
 */
const WRAPPER = 'section.section-container, div.container.responsivegrid';
const AUTO_ATTR = 'data-excat-auto-section';

function hasContent(el) {
  return el.textContent.trim() || el.querySelector('img, iframe, picture, .video__base, .cmp-image');
}

function autoStyle(el, styles) {
  const cls = el.className && typeof el.className === 'string' ? el.className : '';
  const found = [];
  Object.entries(styles || {}).forEach(([pattern, style]) => {
    if (new RegExp(pattern).test(cls) && !found.includes(style)) found.push(style);
  });
  const title = el.querySelector('.title');
  if (title && title.classList.contains('title--center-text')) found.push('centered');
  return found.join(', ');
}

function splitUnits(el, styles) {
  const inner = el.querySelector(':scope > .cmp-container') || el;
  const kids = [...inner.children].filter(hasContent);
  if (kids.length >= 2 && kids.every((k) => k.matches(WRAPPER))) {
    return kids.flatMap((k) => (autoStyle(k, styles).replace('centered', '').trim() ? [k] : splitUnits(k, styles)));
  }
  if (kids.length === 1 && kids[0].matches(WRAPPER) && !autoStyle(el, styles).replace('centered', '').trim()) {
    return splitUnits(kids[0], styles);
  }
  return [el];
}

function autoSections(hookName, document, auto) {
  if (hookName === 'beforeTransform') {
    const all = [...document.querySelectorAll(auto.selector)];
    const tops = all.filter((el) => !all.some((o) => o !== el && o.contains(el)));
    const units = tops.flatMap((el) => splitUnits(el, auto.styles));
    units.forEach((el, i) => {
      el.setAttribute(AUTO_ATTR, String(i));
      const style = autoStyle(el, auto.styles);
      if (style) el.setAttribute(`${AUTO_ATTR}-style`, style);
      if (i > 0) el.parentNode.insertBefore(document.createElement('hr'), el);
    });
  }
  if (hookName === 'afterTransform') {
    [...document.querySelectorAll(`[${AUTO_ATTR}]`)].forEach((el) => {
      // sections emptied by cleanup (share bar, rating widget) are dropped with their break
      if (!el.textContent.trim() && !el.querySelector('img, picture, table, a, iframe')) {
        const prev = el.previousElementSibling;
        if (prev && prev.tagName === 'HR') prev.remove();
        el.remove();
        return;
      }
      const style = el.getAttribute(`${AUTO_ATTR}-style`);
      if (style) {
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style },
        });
        el.append(meta);
      }
      el.removeAttribute(AUTO_ATTR);
      el.removeAttribute(`${AUTO_ATTR}-style`);
    });
  }
}

export default function transform(hookName, element, payload) {
  const { document, template } = payload || {};
  if (document && template && template.autoSections) {
    autoSections(hookName, document, template.autoSections);
    return;
  }
  const sections = template && template.sections;
  if (!document || !Array.isArray(sections) || sections.length < 2) return;

  if (hookName === 'beforeTransform') {
    // resolve elements in document order first so claims are deterministic
    const claimed = [];
    const resolved = sections.map((section) => {
      const el = findSectionElement(document, section, claimed);
      if (el) claimed.push(el);
      return el;
    });

    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = resolved[i];
      if (!el) continue;
      el.setAttribute(SECTION_ATTR, section.id);

      if (i > 0 || section.style) {
        const hr = document.createElement('hr');
        hr.setAttribute(MARKER_ATTR, section.id);
        if (i === 0) hr.setAttribute('data-excat-first-section', 'true');
        el.parentNode.insertBefore(hr, el);
      }
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const sectionEl = document.querySelector(`[${SECTION_ATTR}="${section.id}"]`);
      const marker = document.querySelector(`hr[${MARKER_ATTR}="${section.id}"]`);

      if (section.style) {
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        const anchor = sectionEl || marker;
        if (anchor && anchor.parentNode) {
          anchor.parentNode.insertBefore(meta, anchor.nextSibling);
        }
      }

      if (sectionEl) sectionEl.removeAttribute(SECTION_ATTR);
      if (marker) {
        if (marker.hasAttribute('data-excat-first-section')) {
          marker.remove();
        } else {
          marker.removeAttribute(MARKER_ATTR);
        }
      }
    }
  }
}
