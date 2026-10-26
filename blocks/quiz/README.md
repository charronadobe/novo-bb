# quiz

Custom **quiz** block. Purpose: Scored multi-question knowledge quiz shown one question at a time, with per-answer feedback and a final score.

## Authoring (Document Authoring)

Model: `configuration`

Rows (label in the first cell, value in the second; labels are case-insensitive). All text the visitor sees comes from these rows; a row that is left out simply hides that piece of text or button.

- Optional config rows before "Questions":
  - "Title" | text or heading: large title on the start screen (shown as an h2 unless a heading is authored).
  - "Intro" | text: optional text under the title (links allowed).
  - "Start label" | text: label of the Start pill. Without this row there is no start screen and the quiz opens on question 1.
  - "Counter" | template: question counter, e.g. "Question {n} of {total}".
  - "Continue label" | text: label of the button that submits an answer.
  - "Next label" | text: label of the button that goes to the next question after the feedback. Falls back to the Continue label.
  - "Correct label" | text: shown above the explanation when the answer is right, e.g. "Nicely done!".
  - "Incorrect label" | text: shown above the explanation when the answer is wrong.
  - "Multiple label" | text: instruction shown on questions with more than one correct answer, e.g. "Select all that apply".
  - "Result" | template: score line on the final screen, e.g. "You scored {score} of {total}".
  - "Complete message" | text: message under the score (links allowed).
  - "Restart label" | text: label of the Restart pill on the final screen. Without this row no Restart button is shown.
  - "Score band" | minimum score in percent | message (heading, text, image allowed): repeatable. The final screen shows the message of the highest band the score reaches, e.g. 0 / 30 / 80.
- A "Questions" row.
- question | option | correct | explanation rows. The first row of each question holds the question text; following rows leave cell 1 empty and add more options. "correct" is true or false. The explanation is shown after that option is chosen (rich text and links allowed); a wrong option without an explanation shows the correct option's explanation.

A question with more than one correct option uses checkboxes and counts as right only when exactly the correct options are chosen. When the quiz ends a `quiz:completed` event fires on `window` with `{ score, total }`.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
