# Footer

The footer reads the `footer` document (`content/footer.plain.html` locally, `/footer` in Document Authoring) and renders its sections in order.

## Visible sections

| Section content | Rendered as |
|---|---|
| Only an image | Brand logo |
| A bulleted list of links | Link row (links to other sites open in a new tab) |
| Paragraphs | Legal / copyright lines |

## Exit notice (shown when a visitor follows a link to another site)

A section that starts with a heading and contains a plain (unlinked) bulleted list:

1. Heading – the notice title
2. Paragraph – the notice text
3. Paragraph with a link – the button label (the link target is replaced by the link the visitor clicked)
4. Paragraph – label of the close button (for screen readers)
5. Bulleted list – sites that do **not** show the notice, one host name per item (for example `www.novonordisk.com`)

## Newsletter sign-up (opened by any link to `#newsletter`)

A section whose bulleted list contains nested lists:

1. Paragraphs – introduction text
2. Bulleted list – the form fields, in this order:
   1. Email label, with a nested list: placeholder, invalid-email message
   2. First name label, with a nested list: placeholder
   3. Country label, with a nested list: the "please select" prompt, then one country per item
   4. Optional checkbox text (local newsletter)
   5. Required consent text (may contain a link)
3. Paragraph with a link – the submit button label; the link target is the address the form is sent to
4. Paragraph – message shown when a required field is empty
5. Paragraph – success message
6. Paragraph with a link – link shown after a successful sign-up
7. Paragraph – label of the close button (for screen readers)

The form posts the fields `EMAIL`, `FNAME`, `COUNTRY`, `MERGE9` and `first-consent` as form data. Replace the placeholder submit address (`https://newsletter-endpoint.invalid/subscribe`) with your subscription service endpoint; until then submissions fail and the button is re-enabled.
