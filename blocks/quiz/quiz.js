import { createTag } from '../../scripts/shared.js';

/*
 * Multi-question knowledge quiz, one question at a time.
 * Authoring (all user-facing text is authored, nothing is hard-coded):
 *   optional config rows: key | value (Title, Intro, Start label, Counter, ...)
 *   "Questions" row
 *   question | option | correct (true/false) | explanation
 *   (empty)  | option | correct              | explanation
 */

let instanceCount = 0;

const TRUE_PATTERN = /^(true|yes|x|correct|1)$/i;

const CONFIG_KEYS = {
  title: 'title',
  heading: 'title',
  intro: 'intro',
  introduction: 'intro',
  description: 'intro',
  startlabel: 'start',
  start: 'start',
  startbutton: 'start',
  continuelabel: 'continue',
  continue: 'continue',
  submitlabel: 'continue',
  checklabel: 'continue',
  nextlabel: 'next',
  next: 'next',
  counter: 'counter',
  questioncounter: 'counter',
  correctlabel: 'correct',
  correct: 'correct',
  incorrectlabel: 'incorrect',
  incorrect: 'incorrect',
  result: 'result',
  resultlabel: 'result',
  score: 'result',
  scorelabel: 'result',
  completemessage: 'complete',
  complete: 'complete',
  restartlabel: 'restart',
  restart: 'restart',
  multiplelabel: 'multiple',
  multiple: 'multiple',
  multipleinstruction: 'multiple',
  scoreband: 'band',
  band: 'band',
};

function text(el) {
  return (el?.textContent || '').trim();
}

function configKey(value) {
  return CONFIG_KEYS[value.toLowerCase().replace(/[^a-z]/g, '')] || null;
}

/** Child nodes of a cell; a lone paragraph is unwrapped so it fits inline containers. */
function inlineNodes(cell) {
  if (!cell) return [];
  const elements = [...cell.children];
  if (elements.length === 1 && elements[0].tagName === 'P') return [...elements[0].childNodes];
  return [...cell.childNodes];
}

function hasContent(cell) {
  return !!cell && (text(cell) !== '' || !!cell.querySelector('img, picture'));
}

/** Replaces {name} placeholders in an authored template. */
function fill(template, values) {
  return template.replace(/\{\s*(\w+)\s*\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}

function parseRows(block) {
  const rows = [...block.children];
  const markerIndex = rows.findIndex((row) => text(row.children[0]).toLowerCase() === 'questions');
  const config = { bands: [] };
  const questions = [];
  let current = null;

  rows.forEach((row, index) => {
    if (index === markerIndex) return;
    const [first, second, third, fourth] = row.children;
    const firstText = text(first);
    const key = configKey(firstText);
    if (key === 'band' && (markerIndex === -1 || index < markerIndex)) {
      // Score band | minimum score in percent | message shown when the score reaches it
      const min = parseFloat(text(second));
      if (!Number.isNaN(min) && hasContent(third)) config.bands.push({ min, content: third });
      return;
    }
    if (key && (markerIndex === -1 || index < markerIndex)) {
      config[key] = second || null;
      return;
    }
    if (markerIndex !== -1 && index < markerIndex) return;

    if (firstText) {
      current = { cell: first, options: [] };
      questions.push(current);
    }
    if (current && text(second)) {
      current.options.push({
        label: text(second),
        correct: TRUE_PATTERN.test(text(third)),
        explanation: hasContent(fourth) ? [...fourth.childNodes] : null,
      });
    }
  });

  return { config, questions: questions.filter((q) => q.options.length) };
}

function button(label, className) {
  return createTag('button', { type: 'button', class: `button ${className}` }, label);
}

/** @param {Element} block The quiz block element */
export default function decorate(block) {
  const { config, questions } = parseRows(block);
  if (!questions.length) {
    block.replaceChildren();
    return;
  }

  instanceCount += 1;
  const idPrefix = `quiz-${instanceCount}`;
  const label = (key) => text(config[key]);
  const total = questions.length;
  const nextLabel = label('next') || label('continue');

  /* intro / start screen */
  const intro = createTag('div', { class: 'quiz-intro' });
  if (hasContent(config.title)) {
    const authored = config.title.querySelector('h1, h2, h3, h4, h5, h6');
    const title = authored || createTag('h2', {}, inlineNodes(config.title));
    title.classList.add('quiz-title');
    intro.append(title);
  }
  if (hasContent(config.intro)) {
    intro.append(createTag('div', { class: 'quiz-intro-text' }, [...config.intro.childNodes]));
  }
  const startButton = label('start') ? button(label('start'), 'secondary quiz-start') : null;
  if (startButton) intro.append(startButton);

  /* questions */
  const form = createTag('form', { class: 'quiz-form', novalidate: '' });
  const counter = label('counter') ? createTag('p', { class: 'quiz-counter' }) : null;
  if (counter) form.append(counter);

  const questionEls = questions.map((question, qIndex) => {
    const correctIndexes = question.options
      .map((option, index) => (option.correct ? index : -1))
      .filter((index) => index !== -1);
    const multiple = correctIndexes.length > 1;
    const headingId = `${idPrefix}-q${qIndex}`;
    const heading = createTag('h3', { class: 'quiz-question', id: headingId, tabindex: '-1' }, inlineNodes(question.cell));
    const fieldset = createTag('fieldset', { class: 'quiz-fieldset', hidden: '' }, createTag('legend', {}, heading));
    if (multiple && label('multiple')) {
      fieldset.append(createTag('p', { class: 'quiz-instruction' }, label('multiple')));
    }
    const optionList = createTag('div', { class: 'quiz-options' });
    const inputs = question.options.map((option, oIndex) => {
      const inputId = `${headingId}-o${oIndex}`;
      const input = createTag('input', {
        id: inputId,
        type: multiple ? 'checkbox' : 'radio',
        name: headingId,
        value: String(oIndex),
      });
      optionList.append(createTag('div', { class: 'quiz-answer' }, createTag('label', { class: 'quiz-option', for: inputId }, [
        input,
        createTag('span', { class: 'quiz-option-label' }, option.label),
      ])));
      return input;
    });
    fieldset.append(optionList);
    return {
      question, fieldset, heading, inputs, correctIndexes, multiple,
    };
  });

  const feedback = createTag('div', {
    class: 'quiz-feedback', id: `${idPrefix}-feedback`, tabindex: '-1', 'aria-live': 'polite',
  });
  const action = createTag('button', { type: 'submit', class: 'button secondary quiz-action' }, label('continue'));
  const actions = createTag('div', { class: 'quiz-actions' }, action);
  const card = createTag('div', { class: 'quiz-card' }, [...questionEls.map((q) => q.fieldset), feedback, actions]);
  form.append(card);

  /* result */
  const resultHeading = createTag('h3', { class: 'quiz-score', tabindex: '-1' });
  const result = createTag('div', { class: 'quiz-result', tabindex: '-1', hidden: '' }, resultHeading);
  const band = createTag('div', { class: 'quiz-band' });
  if (config.bands.length) result.append(band);
  if (hasContent(config.complete)) {
    result.append(createTag('div', { class: 'quiz-complete' }, [...config.complete.childNodes]));
  }
  const restart = label('restart') ? button(label('restart'), 'secondary quiz-restart') : null;
  if (restart) result.append(createTag('div', { class: 'quiz-actions' }, restart));

  let currentIndex = 0;
  let answered = false;
  let score = 0;

  function setScreen(name) {
    block.dataset.screen = name;
    if (startButton) intro.hidden = name !== 'start';
    form.hidden = name !== 'question';
    result.hidden = name !== 'result';
  }

  function selectedIndexes(entry) {
    return entry.inputs.filter((input) => input.checked).map((input) => Number(input.value));
  }

  function showQuestion(index, moveFocus) {
    currentIndex = index;
    answered = false;
    questionEls.forEach((entry, i) => { entry.fieldset.hidden = i !== index; });
    const entry = questionEls[index];
    entry.fieldset.disabled = false;
    if (counter) counter.textContent = fill(label('counter'), { n: index + 1, current: index + 1, total });
    card.insertBefore(feedback, actions);
    feedback.replaceChildren();
    feedback.className = 'quiz-feedback';
    action.textContent = label('continue');
    action.disabled = !selectedIndexes(entry).length;
    setScreen('question');
    if (moveFocus) entry.heading.focus();
  }

  function reset() {
    score = 0;
    questionEls.forEach((entry) => {
      entry.inputs.forEach((input) => { input.checked = false; });
      entry.fieldset.querySelectorAll('.quiz-option').forEach((el) => el.classList.remove('is-selected', 'is-correct', 'is-wrong'));
    });
  }

  function checkAnswer() {
    const entry = questionEls[currentIndex];
    const selected = selectedIndexes(entry);
    if (!selected.length) return;
    const correct = selected.length === entry.correctIndexes.length
      && entry.correctIndexes.every((index) => selected.includes(index));
    if (correct) score += 1;
    answered = true;

    const optionEls = [...entry.fieldset.querySelectorAll('.quiz-option')];
    selected.forEach((index) => {
      optionEls[index].classList.add('is-selected', entry.correctIndexes.includes(index) ? 'is-correct' : 'is-wrong');
    });
    entry.fieldset.disabled = true;
    // single-choice: show the explanation inside the chosen answer, as on the source quiz
    if (!entry.multiple) optionEls[selected[0]].parentElement.append(feedback);

    const explanations = selected
      .map((index) => entry.question.options[index].explanation)
      .filter(Boolean);
    if (!explanations.length && !correct) {
      const fallback = entry.question.options[entry.correctIndexes[0]]?.explanation;
      if (fallback) explanations.push(fallback);
    }
    const status = label(correct ? 'correct' : 'incorrect');
    feedback.className = `quiz-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
    feedback.replaceChildren(...[
      status ? createTag('p', { class: 'quiz-feedback-status' }, status) : null,
      ...explanations.map((nodes) => createTag('div', { class: 'quiz-explanation' }, nodes.map((n) => n.cloneNode(true)))),
    ].filter(Boolean));

    action.textContent = nextLabel;
    action.disabled = false;
    if (feedback.childNodes.length) feedback.focus();
    else action.focus();
  }

  function showResult() {
    const values = { score, total };
    resultHeading.textContent = label('result') ? fill(label('result'), values) : '';
    resultHeading.hidden = !label('result');
    const percent = total ? (score / total) * 100 : 0;
    const match = [...config.bands].sort((a, b) => b.min - a.min).find((b) => percent >= b.min);
    band.replaceChildren(...(match ? [...match.content.childNodes].map((n) => n.cloneNode(true)) : []));
    setScreen('result');
    (resultHeading.hidden ? result : resultHeading).focus();
    window.dispatchEvent(new CustomEvent('quiz:completed', { detail: values }));
  }

  // a pointer pick on a single-choice question answers it straight away (as on the source);
  // keyboard users move between radios freely and confirm with the action button
  let pointerPick = false;
  form.addEventListener('pointerdown', () => { pointerPick = true; });
  form.addEventListener('keydown', () => { pointerPick = false; });

  form.addEventListener('change', () => {
    if (answered) return;
    const entry = questionEls[currentIndex];
    action.disabled = !selectedIndexes(entry).length;
    if (pointerPick && !entry.multiple && !action.disabled) checkAnswer();
    pointerPick = false;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!answered) checkAnswer();
    else if (currentIndex < total - 1) showQuestion(currentIndex + 1, true);
    else showResult();
  });

  startButton?.addEventListener('click', () => showQuestion(0, true));
  restart?.addEventListener('click', () => {
    reset();
    showQuestion(0, true);
  });

  block.replaceChildren(...[intro.childNodes.length ? intro : null, form, result].filter(Boolean));
  if (startButton) setScreen('start');
  else showQuestion(0, false);
}
