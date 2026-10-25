/* eslint-disable */
/* global WebImporter */

// Parsers
import heroPhotoBgParser from './parsers/hero-photo-bg.js';
import bmiCalculatorParser from './parsers/bmi-calculator.js';
import cardsVideoParser from './parsers/cards-video.js';
import cardsPhotoCtaParser from './parsers/cards-photo-cta.js';
import cardsStatsParser from './parsers/cards-stats.js';
import columnsMediaParser from './parsers/columns-media.js';
import quizPollParser from './parsers/quiz-poll.js';
import columnsLocatorParser from './parsers/columns-locator.js';
import accordionReferencesParser from './parsers/accordion-references.js';

// Transformers
import novocareCleanupTransformer from './transformers/novocare-cleanup.js';
import novocareSectionsTransformer from './transformers/novocare-sections.js';

const PAGE_TEMPLATE = {
  "name": "home",
  "urls": [
    "https://global.novocare.com/"
  ],
  "representativeUrl": "https://global.novocare.com/",
  "description": "Novocare global homepage: photo hero, BMI calculator, video cards, help-step cards, obesity stats, media/text, poll, provider locator, references",
  "blocks": [
    {
      "name": "hero-photo-bg",
      "instances": [
        ".hero.responsivegrid figure.banner"
      ]
    },
    {
      "name": "bmi-calculator",
      "instances": [
        ".cmp-bmi.cmp-bmi-calculator-v2"
      ]
    },
    {
      "name": "cards-video",
      "instances": [
        ".block--green .splitlayout"
      ]
    },
    {
      "name": "cards-photo-cta",
      "instances": [
        ".splitlayout:has(.cmp-card)"
      ]
    },
    {
      "name": "cards-stats",
      "instances": [
        "section.section-container:has(> .cmp-container > .splitlayout .columns.threeCol) > .cmp-container"
      ]
    },
    {
      "name": "columns-media",
      "instances": [
        ".mediatext.mediatext--left"
      ]
    },
    {
      "name": "quiz-poll",
      "instances": [
        ".minipoll"
      ]
    },
    {
      "name": "columns-locator",
      "instances": [
        ".hcp-locator"
      ]
    },
    {
      "name": "accordion-references",
      "instances": [
        ".accordion"
      ]
    }
  ],
  "urlPattern": "/",
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
      "name": "BMI calculator",
      "selector": [
        "section.section-container:has(.cmp-bmi-calculator-v2)"
      ],
      "style": "light-grey",
      "blocks": [
        "bmi-calculator"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "Small wins intro with videos",
      "selector": [
        "section.section-container:has(> .cmp-container > .block--green)"
      ],
      "style": "light-green, centered",
      "blocks": [
        "cards-video"
      ],
      "defaultContent": [
        ".block--green > .cmp-container > .title",
        ".block--green > .cmp-container > .text"
      ]
    },
    {
      "id": "section-4",
      "name": "Getting help steps",
      "selector": [
        "section.section-container:has(> .cmp-container > .splitlayout .cmp-card)"
      ],
      "style": "light-grey, centered",
      "blocks": [
        "cards-photo-cta"
      ],
      "defaultContent": [
        "section.section-container:has(> .cmp-container > .splitlayout .cmp-card) > .cmp-container > .title"
      ]
    },
    {
      "id": "section-5",
      "name": "Obesity stats",
      "selector": [
        "section.section-container:has(> .cmp-container > .splitlayout .columns.threeCol)"
      ],
      "style": "light-grey",
      "blocks": [
        "cards-stats"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6",
      "name": "Obesity care media text",
      "selector": [
        "section.section-container:has(> .cmp-container > .mediatext--left)"
      ],
      "style": "light-grey",
      "blocks": [
        "columns-media"
      ],
      "defaultContent": []
    },
    {
      "id": "section-7",
      "name": "Motivation poll",
      "selector": [
        "section.section-container:has(.minipoll)"
      ],
      "style": "light-grey",
      "blocks": [
        "quiz-poll"
      ],
      "defaultContent": [
        "section.section-container:has(.minipoll) .text.text--xs"
      ]
    },
    {
      "id": "section-8",
      "name": "Find local provider",
      "selector": [
        "section.section-container--xlarge:has(.hcp-locator)"
      ],
      "style": "light-grey",
      "blocks": [
        "columns-locator"
      ],
      "defaultContent": []
    },
    {
      "id": "section-9",
      "name": "References",
      "selector": [
        "section.section-container:has(> .cmp-container > .accordion)"
      ],
      "style": "light-grey",
      "blocks": [
        "accordion-references"
      ],
      "defaultContent": []
    },
    {
      "id": "section-10",
      "name": "Page job code",
      "selector": [
        ".veevaid__wrapper"
      ],
      "style": "centered, small-print",
      "blocks": [],
      "defaultContent": [
        ".veevaid__wrapper"
      ]
    }
  ]
};

const parsers = {
  'hero-photo-bg': heroPhotoBgParser,
  'bmi-calculator': bmiCalculatorParser,
  'cards-video': cardsVideoParser,
  'cards-photo-cta': cardsPhotoCtaParser,
  'cards-stats': cardsStatsParser,
  'columns-media': columnsMediaParser,
  'quiz-poll': quizPollParser,
  'columns-locator': columnsLocatorParser,
  'accordion-references': accordionReferencesParser,
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
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
