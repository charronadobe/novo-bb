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

export default function transform(hookName, element, payload) {
  const { document, template } = payload || {};
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
