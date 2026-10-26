# whtr-calculator

Custom **whtr-calculator** block. Purpose: Client-side Waist-to-Height Ratio calculator with optional info tooltip, metric/imperial toggle, height and waist inputs, ratio result and health-risk category; nothing is submitted.

## Authoring (Document Authoring)

Model: `configuration`

Key/value rows (label in the first cell, value in the second): key/value rows. Title | heading text (or a heading row); Info | tooltip button label | tooltip text (optional); Metric | label; Imperial | label; Units label | optional legend; Height | label; Waist | label; Metric units | "cm" (or "cm, cm" for height, waist); Imperial units | "ft, in, in" (height ft, height in, waist in); Button | button label; Result | result prefix e.g. "Your Waist-to-Height Ratio is"; Error | message when inputs are missing; Field error | optional short message next to an empty field label e.g. "Input required"; Category | category name | upper ratio limit (exclusive, empty for the last one) | optional description. Any other single-cell row is shown as intro text.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
