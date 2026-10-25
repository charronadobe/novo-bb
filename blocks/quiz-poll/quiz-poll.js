import { createTag } from '../../scripts/shared.js';

/*
 * Single-question poll. Same table shape as the quiz block:
 *   optional config rows (e.g. "Thank you message" | text, "Back label" | text)
 *   "Questions" row
 *   question | option | (result shown for this option)
 *   (empty)  | option | (result)
 * Selecting an answer swaps the question for that option's result (or the
 * shared thank-you message) and a Back button that returns to the question.
 * A third cell that only holds a quiz "correct" flag is ignored.
 */

let instanceCount = 0;

const FLAG_PATTERN = /^(true|false|yes|no|x|correct)?$/i;
const SVG_NS = 'http://www.w3.org/2000/svg';

function text(cell) {
  return (cell?.textContent || '').trim();
}

function configKey(value) {
  const key = value.toLowerCase().replace(/[^a-z]/g, '');
  if (['thankyoumessage', 'thankyou', 'completemessage', 'confirmation'].includes(key)) return 'thankYou';
  if (['backlabel', 'back', 'backbutton', 'backbuttonlabel'].includes(key)) return 'backLabel';
  return null;
}

function resultNodes(cell) {
  if (!cell || FLAG_PATTERN.test(text(cell)) || (!text(cell) && !cell.querySelector('img'))) return null;
  return [...cell.childNodes];
}

function parseRows(block) {
  const rows = [...block.children];
  const config = {};
  const markerIndex = rows.findIndex((row) => text(row.children[0]).toLowerCase() === 'questions');
  const questions = [];
  let current = null;

  rows.forEach((row, index) => {
    if (index === markerIndex) return;
    const first = text(row.children[0]);
    const key = configKey(first);
    if (key && (markerIndex === -1 || index < markerIndex)) {
      config[key] = row.children[1] ? [...row.children[1].childNodes] : [];
      return;
    }
    if (markerIndex !== -1 && index < markerIndex) return;

    const option = text(row.children[1]);
    if (first) {
      current = {
        text: first,
        heading: row.children[0].querySelector('h1, h2, h3, h4, h5, h6'),
        options: [],
      };
      questions.push(current);
    }
    if (current && option) current.options.push({ label: option, result: resultNodes(row.children[2]) });
  });

  return { config, questions };
}

function backIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'quiz-poll-back-icon');
  svg.setAttribute('viewBox', '0 0 18 18');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M14.25 9H3.75M3.75 9L9 14.25M3.75 9L9 3.75');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/** @param {Element} block The quiz-poll block element */
export default function decorate(block) {
  const { config, questions } = parseRows(block);
  const question = questions[0];
  if (!question || !question.options.length) {
    block.replaceChildren();
    return;
  }

  instanceCount += 1;
  const idPrefix = `quiz-poll-${instanceCount}`;
  const questionId = `${idPrefix}-question`;
  const questionEl = question.heading || createTag('p', {}, question.text);
  questionEl.classList.add('quiz-poll-question');
  questionEl.id = questionId;

  const options = createTag('div', { class: 'quiz-poll-options', role: 'group', 'aria-labelledby': questionId });
  const questionPanel = createTag('div', { class: 'quiz-poll-question-panel' }, [questionEl, options]);

  const fallback = config.thankYou?.length ? config.thankYou : null;
  const results = question.options.map((option, index) => {
    const nodes = option.result || fallback?.map((n) => n.cloneNode(true));
    if (!nodes) return null;
    const result = createTag('div', { class: 'quiz-poll-result', 'data-index': String(index), hidden: '' });
    const hasBlocks = nodes.some((n) => n.nodeType === Node.ELEMENT_NODE && n.matches('p, ul, ol, div, h1, h2, h3, h4, h5, h6'));
    if (hasBlocks) result.append(...nodes);
    else result.append(createTag('p', {}, nodes));
    return result;
  });

  // The Back button is only rendered when its label is authored ("Back label" row)
  const backLabel = (config.backLabel || []).map((n) => n.textContent).join('').trim();
  const back = backLabel ? createTag('button', { type: 'button', class: 'button quiz-poll-back' }, [
    backIcon(),
    createTag('span', { class: 'quiz-poll-back-label' }, backLabel),
  ]) : null;
  const resultPanel = createTag('div', {
    class: 'quiz-poll-result-panel', id: `${idPrefix}-result`, tabindex: '-1', hidden: '',
  }, [...results.filter(Boolean), back].filter(Boolean));

  const buttons = question.options.map((option, index) => {
    const button = createTag('button', {
      type: 'button',
      class: 'button quiz-poll-option',
      'aria-pressed': 'false',
      'data-index': String(index),
    }, option.label);
    options.append(button);
    return button;
  });

  let selectedIndex = -1;

  options.addEventListener('click', (event) => {
    const selected = event.target.closest('.quiz-poll-option');
    if (!selected) return;
    selectedIndex = Number(selected.dataset.index);
    buttons.forEach((button) => {
      const isSelected = button === selected;
      button.setAttribute('aria-pressed', String(isSelected));
      button.classList.toggle('is-selected', isSelected);
    });
    block.classList.add('is-answered');
    const result = results[selectedIndex];
    if (result) {
      results.forEach((r) => { if (r) r.hidden = r !== result; });
      questionPanel.hidden = true;
      resultPanel.hidden = false;
      resultPanel.focus();
    }
    block.dispatchEvent(new CustomEvent('poll:answered', {
      bubbles: true,
      detail: { question: question.text, answer: selected.textContent, index: selectedIndex },
    }));
  });

  back?.addEventListener('click', () => {
    resultPanel.hidden = true;
    questionPanel.hidden = false;
    block.classList.remove('is-answered');
    (buttons[selectedIndex] || buttons[0]).focus();
  });

  block.replaceChildren(questionPanel, resultPanel);
}
