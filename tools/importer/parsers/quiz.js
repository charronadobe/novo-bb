/* eslint-disable */
/* global WebImporter */
/**
 * Parser for quiz.
 * Source: .quiz .cmp-quiz (global.novocare.com obesity-and-heart-health): start page (title,
 * Start button), question pages (.question-page[data-answer] = 1-based correct option,
 * h4 question, label options, .cmp-quiz__answer-info explanation per option, Continue
 * button) and a result page (score bands in data-scores, correct/incorrect reasons).
 * Output (quiz configuration table):
 *   Title | Start label | Counter | Continue label | Correct label | Incorrect label |
 *   Score band rows (min % | heading + text) | Questions |
 *   question | option | true/false | explanation rows
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const quiz = element.querySelector('.cmp-quiz') || element;
  const cells = [];

  const title = quiz.querySelector('.cmp-quiz__page:not(.question-page):not(.cmp-quiz__page--result) h2, [data-quiz-title]');
  if (title) cells.push(['Title', clean(title.textContent || title.getAttribute('data-quiz-title'))]);
  const startBtn = quiz.querySelector('.cmp-quiz__page:not(.question-page):not(.cmp-quiz__page--result) button');
  if (startBtn) cells.push(['Start label', clean(startBtn.textContent)]);

  const counter = quiz.querySelector('.cmp-quiz__counter');
  if (counter) {
    const total = counter.getAttribute('data-total-questions');
    const current = counter.querySelector('.cmp-quiz__counter-val');
    let tpl = clean(counter.textContent);
    if (current) tpl = tpl.replace(clean(current.textContent), '{n}');
    if (total) tpl = tpl.replace(new RegExp(`\\b${total}\\b`), '{total}');
    cells.push(['Counter', tpl]);
  }
  const pages = [...quiz.querySelectorAll('.question-page')];
  const cont = pages[0] && pages[0].querySelector('button');
  if (cont) cells.push(['Continue label', clean(cont.textContent)]);

  const result = quiz.querySelector('.cmp-quiz__page--result');
  if (result) {
    const correct = result.querySelector('[data-result="correct"] p');
    const incorrect = result.querySelector('[data-result="incorrect"] p');
    if (correct && clean(correct.textContent)) cells.push(['Correct label', clean(correct.textContent)]);
    if (incorrect && clean(incorrect.textContent)) cells.push(['Incorrect label', clean(incorrect.textContent)]);

    let scores = [];
    try {
      scores = JSON.parse(result.querySelector('[data-scores]').getAttribute('data-scores'));
    } catch (e) {
      scores = [];
    }
    result.querySelectorAll('.cmp-quiz__category[data-category]').forEach((cat) => {
      const band = scores.find((s) => String(s.category) === cat.getAttribute('data-category'));
      const min = band ? Math.ceil(Number(band.min)) : 0;
      const content = [];
      const h = cat.querySelector('h3, h2, h4');
      if (h && clean(h.textContent)) {
        const h3 = document.createElement('h3');
        h3.textContent = clean(h.textContent);
        content.push(h3);
      }
      cat.querySelectorAll('.cmp-quiz__text p').forEach((p) => { if (clean(p.textContent)) content.push(p.cloneNode(true)); });
      if (content.length) cells.push(['Score band', String(min), content]);
    });
  }

  cells.push(['Questions']);
  pages.forEach((page) => {
    const answer = Number(page.getAttribute('data-answer'));
    const question = clean(page.querySelector('.cmp-quiz__question')?.textContent);
    [...page.querySelectorAll('.cmp-quiz__answer')].forEach((ans, i) => {
      const label = ans.querySelector('label');
      const option = clean(label ? label.textContent : '');
      if (!option) return;
      const info = [...ans.querySelectorAll('.cmp-quiz__answer-info > *')].filter((n) => clean(n.textContent)).map((n) => n.cloneNode(true));
      cells.push([i === 0 ? question : '', option, i + 1 === answer ? 'true' : 'false', info.length ? info : '']);
    });
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'quiz', cells });
  element.replaceWith(block);
}
