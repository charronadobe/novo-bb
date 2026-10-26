/* eslint-disable */
/* global WebImporter */
/**
 * Parser for newsletter.
 * Source: .newsletter form (global.novocare.com join-the-community) - EMAIL, FNAME,
 * COUNTRY (select), MERGE9 and first-consent checkboxes, submit button and the
 * success container.
 * Output: one cell with the same list-based structure as the footer sign-up section:
 *   ul: Email label > [placeholder, invalid-email message]; First name label > [placeholder];
 *       Country label > [prompt, countries...]; local-newsletter checkbox text; consent text
 *   p > a: submit label (href = subscription endpoint placeholder, replace with the real one)
 *   p: required-field message, p: success message, p > a: success link
 */
const ENDPOINT = 'https://newsletter-endpoint.invalid/subscribe';

function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function li(document, content, nested) {
  const item = document.createElement('li');
  if (typeof content === 'string') item.textContent = content;
  else item.append(...content);
  if (nested && nested.length) {
    const ul = document.createElement('ul');
    nested.filter(Boolean).forEach((t) => {
      const n = document.createElement('li');
      n.textContent = t;
      ul.append(n);
    });
    item.append(ul);
  }
  return item;
}

export default function parse(element, { document }) {
  const form = element.querySelector('form') || element;
  const fieldText = (name) => form.querySelector(`[name="${name}"]`)?.closest('.cmp-form-text');
  const email = fieldText('EMAIL');
  const fname = fieldText('FNAME');
  const select = form.querySelector('select[name="COUNTRY"]');
  const countryLabel = select && select.closest('fieldset')?.querySelector('label, legend');
  const merge9 = form.querySelector('input[name="MERGE9"]');
  const consent = form.querySelector('input[name="first-consent"]');

  const ul = document.createElement('ul');
  if (email) {
    ul.append(li(document, clean(email.querySelector('label')?.textContent), [
      email.querySelector('input')?.getAttribute('placeholder'),
      email.getAttribute('data-cmp-constraint-message'),
    ]));
  }
  if (fname) {
    ul.append(li(document, clean(fname.querySelector('label')?.textContent), [
      fname.querySelector('input')?.getAttribute('placeholder'),
    ]));
  }
  if (select) {
    const options = [...select.querySelectorAll('option')].map((o) => clean(o.textContent)).filter(Boolean);
    ul.append(li(document, clean(countryLabel?.textContent), options));
  }
  if (merge9) {
    ul.append(li(document, clean(merge9.closest('label')?.textContent)));
  }
  if (consent) {
    const scope = consent.closest('.cmp-container') || consent.closest('fieldset');
    const textEl = scope && scope.querySelector('.text p, .text');
    const nodes = textEl && clean(textEl.textContent)
      ? [...(textEl.matches('p') ? textEl.childNodes : (textEl.querySelector('p') || textEl).childNodes)].map((n) => n.cloneNode(true))
      : [document.createTextNode(clean(consent.closest('label')?.textContent))];
    ul.append(li(document, nodes));
  }

  const out = [ul];
  const button = form.querySelector('button[type="submit" i], button');
  const submit = document.createElement('p');
  const a = document.createElement('a');
  a.href = ENDPOINT;
  a.textContent = clean(button?.textContent);
  submit.append(a);
  out.push(submit);

  const required = form.querySelector('[data-cmp-required-message]')?.getAttribute('data-cmp-required-message');
  if (required) {
    const p = document.createElement('p');
    p.textContent = required;
    out.push(p);
  }

  const success = element.querySelector('.subscription-successful-container');
  if (success) {
    const link = success.querySelector('a[href]');
    const msg = document.createElement('p');
    msg.textContent = clean([...success.querySelector('p')?.childNodes || []].filter((n) => n !== link).map((n) => n.textContent).join(' '));
    out.push(msg);
    if (link) {
      const p = document.createElement('p');
      const la = document.createElement('a');
      la.href = link.getAttribute('href');
      la.textContent = clean(link.textContent);
      p.append(la);
      out.push(p);
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'newsletter', cells: [[out]] });
  element.replaceWith(block);
}
