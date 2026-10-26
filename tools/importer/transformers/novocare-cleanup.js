/* eslint-disable */
/* global WebImporter */

/**
 * Cleanup transformer for global.novocare.com.
 * Removes non-authorable site chrome (header, footer, OneTrust cookie consent,
 * Scene7 video player chrome, scripts/styles/links) while keeping all
 * authorable content and parser target elements intact.
 */

// Removed before parsers run (would otherwise interfere with block matching).
const BEFORE_SELECTORS = [
  // Site chrome
  'header.header',
  'footer.footer',
  'a.skip-to-main',
  // floating "Find a doctor" button repeated on every page (page furniture)
  '.cta-button--sticky-br',
  '.cmp-geo-locator',
  '.country-dropdown-inner',
  'nav.megamenu--nav',
  // Cookie consent (OneTrust / cookielaw)
  '#onetrust-consent-sdk',
  '#onetrust-banner-sdk',
  '#onetrust-pc-sdk',
  '.onetrust-pc-dark-filter',
  '.ot-sdk-container',
  '#ot-sdk-btn',
  '.ot-sdk-show-settings',
  'iframe.ot-text-resize',
  // Modals outside content
  '.cmp-modal__wrapper',
  // Scene7 video player chrome (controls, share dialogs, icons)
  '.s7waiticon',
  '.s7iconeffect',
  '.s7socialshare',
  '.s7controlbar',
  '.s7emaildialog',
  '.s7embeddialog',
  '.s7linkdialog',
  '.s7closedcaptionbutton',
  '.s7audiocaptions',
  '.s7scrollbuttoncontainer',
  // Empty rich media placeholders (rich media holding a video iframe is parsed as an embed)
  '.richmedia:not(:has(iframe))',
  // Social share bar (the site injects its own share dock) and article rating widget (needs a backend)
  '.sharing',
  '.rating',
  // Empty AEM tagline placeholders
  '.tagline:not(:has(*))',
];

// Final cleanup after parsers ran. Do not touch HTML comments here.
const AFTER_SELECTORS = [
  'script',
  'style',
  'link',
  'noscript',
  'iframe',
  'header',
  'footer',
  'nav',
  '#onetrust-consent-sdk',
];

function removeAll(root, selectors) {
  selectors.forEach((sel) => {
    try {
      root.querySelectorAll(sel).forEach((el) => el.remove());
    } catch (e) {
      // ignore unsupported selectors
    }
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    // the article category tagline is repeated next to the bottom share bar; keep only the
    // one in the article header (the container that also holds the title)
    element.querySelectorAll('.tagline').forEach((tag) => {
      const scope = tag.parentElement;
      if (scope && !scope.querySelector('.title')) tag.remove();
    });
    removeAll(element, BEFORE_SELECTORS);
    removeAll(element, ['script', 'style', 'link', 'noscript']);
  }

  if (hookName === 'afterTransform') {
    removeAll(element, AFTER_SELECTORS);
    // bold/italic wrapping only punctuation (e.g. an opening quote mark) cannot be expressed
    // in the document and shows up as literal asterisks: keep the character as plain text
    element.querySelectorAll('b, strong, i, em').forEach((el) => {
      const text = el.textContent;
      if (text.trim() && !/[\p{L}\p{N}]/u.test(text) && !el.querySelector('img')) el.replaceWith(text);
    });
    // one h1 per page: later h1s (e.g. a title component below the hero) become h2
    [...element.querySelectorAll('h1')].slice(1).forEach((h1) => {
      const h2 = element.ownerDocument.createElement('h2');
      h2.innerHTML = h1.innerHTML;
      h1.replaceWith(h2);
    });
    // Strip tracking / inline handler attributes
    element.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const n = attr.name;
        if (
          n.startsWith('on')
          || n.startsWith('data-analytics')
          || n.startsWith('data-track')
          || n.startsWith('data-gtm')
          || n === 'data-cmp-data-layer'
        ) {
          el.removeAttribute(n);
        }
      });
    });
  }
}
