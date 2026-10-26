# newsletter

Custom **form** block. Purpose: Inline newsletter sign-up form (email, first name, country, local newsletter opt-in, required consent) posted to a subscription service, with a success message after sign-up.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: single cell: optional intro (heading/paragraphs); bulleted list of fields in fixed order (Email label > nested placeholder, invalid-email message; First name label > nested placeholder; Country label > nested prompt then one country per item; local newsletter checkbox text; consent checkbox text, may contain a link); paragraph link = submit button (text = label, href = endpoint); paragraph = required-field message; paragraph = success message; optional paragraph link shown after sign-up.

The block has one cell. Its content, in order:

1. Optional heading and paragraphs – introduction shown above the form
2. Bulleted list – the form fields, in this order:
   1. Email label, with a nested list: placeholder, invalid-email message
   2. First name label, with a nested list: placeholder
   3. Country label, with a nested list: the "please select" prompt, then one country per item
   4. Optional checkbox text (local newsletter)
   5. Required consent text (may contain a link)
3. Paragraph with a link – the submit button label; the link target is the address the form is sent to
4. Paragraph – message shown when a required field is empty
5. Paragraph – success message (replaces the form after a successful sign-up)
6. Optional paragraph with a link – link shown after a successful sign-up

The field list is the same as the footer newsletter sign-up section (see `blocks/footer/README.md`). The form posts the fields `EMAIL`, `FNAME`, `COUNTRY`, `MERGE9` and `first-consent` as form data. If the submission fails, the button is re-enabled and the form stays visible.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
