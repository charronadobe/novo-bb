# quiz-poll

Custom **quiz** block. Purpose: Single poll question with answer buttons and no correct answer.

## Authoring (Document Authoring)

Model: `configuration`

Rows (label in the first cell, value in the second):

- Optional config rows before "Questions":
  - "Thank you message" | text: shown after any answer that has no result of its own.
  - "Back label" | text: label of the button that returns to the question. Without this row no Back button is shown.
- A "Questions" row.
- question | option | result rows. The first row holds the question; following rows leave cell 1 empty. The third cell is the result text shown for that option (links allowed). A third cell that only holds a quiz "correct" flag (true/false/yes/no/x) is ignored.

Choosing an answer hides the question, shows that option's result and a Back pill; Back returns to the question. A bubbling `poll:answered` event fires on each answer.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
