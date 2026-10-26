/* eslint-disable */
/* global WebImporter */
/**
 * Parser for quiz-poll.
 * Source: .minipoll (global.novocare.com) - p.minipoll-question, ul.minipoll-answers
 * (button[data-answer]) and ul.minipoll-results (li[data-result]) with one response
 * per answer.
 * Output (quiz table shape):
 *   [Thank you message | text]   (only when the source has a single shared response)
 *   [Questions]
 *   [question | option 1 | response 1]
 *   [         | option 2 | response 2] ...
 * The third cell is accepted (and ignored) by the block; it preserves the source's
 * per-answer responses for authors.
 */
function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

// .votes (menopause page): one question and two answer buttons; vote counts come from a
// server endpoint and are not migrated, so the poll has no per-answer responses.
function parseVotes(element, document) {
  const cells = [['Questions', '', '']];
  const question = clean(element.querySelector('.votes-container__question-layer .votes-container__question p, .votes-container__question p')?.textContent);
  [...element.querySelectorAll('.votes-container__question-layer button.votes-container__answer')].forEach((btn, index) => {
    const label = clean(btn.textContent);
    if (label) cells.push([index === 0 ? question : '', label, '']);
  });
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'quiz-poll', cells }));
}

export default function parse(element, { document }) {
  if (element.classList.contains('votes')) {
    parseVotes(element, document);
    return;
  }
  const cells = [];

  // .minipoll-question first: the container may also hold an overline (job code) paragraph
  const question = element.querySelector('.minipoll-question') || element.querySelector('.minipoll-question-container p:not(.minipoll-overline)');
  const answers = [...element.querySelectorAll('.minipoll-answers .minipoll-answer')];
  const results = [...element.querySelectorAll('.minipoll-results .minipoll-result')];

  const resultFor = (answerEl, index) => {
    const btn = answerEl.querySelector('button, [data-answer]');
    const key = btn && btn.getAttribute('data-answer');
    let res = key ? results.find((r) => r.getAttribute('data-result') === key) : null;
    if (!res) res = results[index];
    return res;
  };

  const perAnswer = results.length > 1;

  // Single shared response -> Thank you message row
  if (results.length === 1) {
    const content = [...results[0].children].map((c) => c.cloneNode(true));
    cells.push(['Thank you message', content.length ? content : clean(results[0].textContent), '']);
  }

  const backText = clean(element.querySelector('.minipoll-back-text')?.textContent);
  if (backText) cells.push(['Back label', backText, '']);

  cells.push(['Questions', '', '']);

  answers.forEach((answerEl, index) => {
    const label = clean(answerEl.textContent);
    if (!label) return;
    const firstCell = index === 0 && question ? clean(question.textContent) : '';
    let third = '';
    if (perAnswer) {
      const res = resultFor(answerEl, index);
      if (res) {
        const content = [...res.children].map((c) => c.cloneNode(true));
        third = content.length ? content : clean(res.textContent);
      }
    }
    cells.push([firstCell, label, third]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'quiz-poll', cells });
  element.replaceWith(block);
}
