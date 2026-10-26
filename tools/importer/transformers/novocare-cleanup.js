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
  // Empty rich media placeholders
  '.richmedia',
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
    removeAll(element, BEFORE_SELECTORS);
    removeAll(element, ['script', 'style', 'link', 'noscript']);
  }

  if (hookName === 'afterTransform') {
    removeAll(element, AFTER_SELECTORS);
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
