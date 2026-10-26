# cards-article-filter

Custom **cards** block. Purpose: Article listing that readers can filter by category.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: Cell 1: article photo. Cell 2: category (first paragraph, plain text), title heading containing the link to the article, description paragraph, optional read-time paragraph last (e.g. "5 min. read"). Optional config rows before the articles: "All" | label of the show-all pill (omit for no show-all pill; clicking the active pill again always shows all articles); "Filter label" | accessible name of the pill group. Pills are built from the distinct categories in card order; ?category=<slug> in the URL preselects a pill.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
