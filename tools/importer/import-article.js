/* eslint-disable */
/* global WebImporter */

// Parsers
import heroPhotoBgParser from './parsers/hero-photo-bg.js';
import tableBorderlessParser from './parsers/table-borderless.js';
import columnsLocatorParser from './parsers/columns-locator.js';
import cardsArticleSliderParser from './parsers/cards-article-slider.js';

// Transformers
import novocareCleanupTransformer from './transformers/novocare-cleanup.js';
import novocareSectionsTransformer from './transformers/novocare-sections.js';

const PAGE_TEMPLATE = {
  "name": "article",
  "urls": [
    "https://global.novocare.com/what-is-obesity.html"
  ],
  "representativeUrl": "https://global.novocare.com/what-is-obesity.html",
  "description": "Article page: photo hero, long-form body with headings/lists/table, provider locator, related-articles slider, job code",
  "urlPattern": "/*",
  "blocks": [
    {
      "name": "hero-photo-bg",
      "instances": [
        ".hero.responsivegrid figure.banner"
      ]
    },
    {
      "name": "table-borderless",
      "instances": [
        ".table.parbase"
      ]
    },
    {
      "name": "columns-locator",
      "instances": [
        ".hcp-locator"
      ]
    },
    {
      "name": "cards-article-slider",
      "instances": [
        ".carousel.panelcontainer"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Hero",
      "selector": [
        ".hero.responsivegrid"
      ],
      "style": null,
      "blocks": [
        "hero-photo-bg"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Article body",
      "selector": [
        "section.section-container.section-container--small.section-container--dwsp-medium"
      ],
      "style": null,
      "blocks": [
        "table-borderless"
      ],
      "defaultContent": [
        ".title",
        ".text"
      ]
    },
    {
      "id": "section-3",
      "name": "Find local provider",
      "selector": [
        "section.section-container--xlarge:has(.hcp-locator)"
      ],
      "style": null,
      "blocks": [
        "columns-locator"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "Related articles",
      "selector": [
        "section.section-container:has(> .cmp-container > .carousel)"
      ],
      "style": null,
      "blocks": [
        "cards-article-slider"
      ],
      "defaultContent": [
        "section.section-container:has(> .cmp-container > .carousel) > .cmp-container > .title",
        "section.section-container:has(> .cmp-container > .carousel) > .cmp-container > .ctabutton"
      ]
    },
    {
      "id": "section-5",
      "name": "Page job code",
      "selector": [
        ".veevaid__wrapper"
      ],
      "style": "small-print",
      "blocks": [],
      "defaultContent": [
        ".veevaid__wrapper"
      ]
    }
  ],
  "targetPaths": {
    "https://global.novocare.com/what-is-obesity.html": "/obesity/what-is-obesity"
  }
};

const parsers = {
  'hero-photo-bg': heroPhotoBgParser,
  'table-borderless': tableBorderlessParser,
  'columns-locator': columnsLocatorParser,
  'cards-article-slider': cardsArticleSliderParser,
};

const transformers = [
  novocareCleanupTransformer,
  novocareSectionsTransformer,
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); } catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); } catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const target = (PAGE_TEMPLATE.targetPaths || {})[params.originalURL];
    const path = WebImporter.FileUtils.sanitizePath(target || (rawPath === '' ? '/index' : rawPath));

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
