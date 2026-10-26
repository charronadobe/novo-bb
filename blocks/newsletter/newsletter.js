/*
 * Newsletter block
 * Inline newsletter sign-up form on a tinted panel. One cell, authored like the footer
 * newsletter section: optional intro, bulleted field list with nested lists, submit link
 * (href = endpoint), required message, success message, optional success link.
 * See README.md for the authoring structure.
 */

import { buildSignupForm } from '../../scripts/shared.js';

/** @param {Element} block */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div') || block;
  const { intro, form, success } = buildSignupForm([...cell.children], { classPrefix: 'newsletter' });
  if (!form) return;

  const children = [];
  if (intro.length) {
    const introWrapper = document.createElement('div');
    introWrapper.className = 'newsletter-intro';
    introWrapper.append(...intro);
    children.push(introWrapper);
  }
  children.push(form, success);
  block.replaceChildren(...children);
}
