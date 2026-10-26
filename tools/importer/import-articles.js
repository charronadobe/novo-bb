/* eslint-disable */
/* global WebImporter */

// Parsers
import heroPhotoBgParser from './parsers/hero-photo-bg.js';
import breadcrumbParser from './parsers/breadcrumb.js';
import cardsStatsParser from './parsers/cards-stats.js';
import cardsVideoParser from './parsers/cards-video.js';
import cardsTextParser from './parsers/cards-text.js';
import cardsPhotoCtaParser from './parsers/cards-photo-cta.js';
import columnsParser from './parsers/columns.js';
import carouselVideoParser from './parsers/carousel-video.js';
import cardsArticleSliderParser from './parsers/cards-article-slider.js';
import columnsMediaParser from './parsers/columns-media.js';
import quizParser from './parsers/quiz.js';
import quizPollParser from './parsers/quiz-poll.js';
import whtrCalculatorParser from './parsers/whtr-calculator.js';
import bmiCalculatorParser from './parsers/bmi-calculator.js';
import columnsLocatorParser from './parsers/columns-locator.js';
import accordionReferencesParser from './parsers/accordion-references.js';
import accordionParser from './parsers/accordion.js';
import pdfViewerParser from './parsers/pdf-viewer.js';
import newsletterParser from './parsers/newsletter.js';
import cardsArticleFilterParser from './parsers/cards-article-filter.js';
import tableBorderlessParser from './parsers/table-borderless.js';
import embedParser from './parsers/embed.js';

// Transformers
import novocareCleanupTransformer from './transformers/novocare-cleanup.js';
import novocareSectionsTransformer from './transformers/novocare-sections.js';

const PAGE_TEMPLATE = {
  "name": "articles",
  "description": "Articles listing page: title, intro and the filterable article card grid.",
  "urls": [
    "https://global.novocare.com/articles.html"
  ],
  "blocks": [
    {
      "name": "hero-photo-bg",
      "instances": [
        ".hero.responsivegrid figure.banner"
      ]
    },
    {
      "name": "breadcrumb",
      "instances": [
        ".breadcrumb"
      ]
    },
    {
      "name": "cards-stats",
      "instances": [
        ".splitlayout:has(.mediatext):not(:has(.ctabutton)):not(:has(iframe))"
      ]
    },
    {
      "name": "cards-video",
      "instances": [
        ".cmp-card:has(iframe)",
        ".splitlayout:has(.video__base)",
        ".splitlayout:has(iframe)"
      ]
    },
    {
      "name": "cards-text",
      "instances": [
        ".splitlayout:has(.cmp-card):not(:has(.cmp-card-background))"
      ]
    },
    {
      "name": "cards-photo-cta",
      "instances": [
        ".splitlayout:has(.cmp-card-background)",
        ".splitlayout:has(.mediatext .ctabutton)",
        ".splitlayout:has(.image img):not(:has(.cmp-card, .mediatext, iframe, .video__base))"
      ]
    },
    {
      "name": "columns",
      "instances": [
        ".splitlayout:has(.title):not(:has(img, iframe, .video__base, .cmp-card, .mediatext))"
      ]
    },
    {
      "name": "carousel-video",
      "instances": [
        ".carousel.panelcontainer:has(.video__base)",
        ".carousel.panelcontainer:has(iframe)"
      ]
    },
    {
      "name": "cards-article-slider",
      "instances": [
        ".carousel.panelcontainer:has(.card)"
      ]
    },
    {
      "name": "columns-media",
      "instances": [
        ".mediatext",
        ".testimonial"
      ]
    },
    {
      "name": "quiz",
      "instances": [
        ".quiz:has(.cmp-quiz)"
      ]
    },
    {
      "name": "quiz-poll",
      "instances": [
        ".minipoll",
        ".votes"
      ]
    },
    {
      "name": "whtr-calculator",
      "instances": [
        ".cmp-whc"
      ]
    },
    {
      "name": "bmi-calculator",
      "instances": [
        ".cmp-bmi.cmp-bmi-calculator-v2"
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
        ".accordion.accordion--transparent",
        ".accordion.accordion--small-text"
      ]
    },
    {
      "name": "accordion",
      "instances": [
        ".accordion:not(.accordion--transparent):not(.accordion--small-text)"
      ]
    },
    {
      "name": "pdf-viewer",
      "instances": [
        ".pdfviewer"
      ]
    },
    {
      "name": "newsletter",
      "instances": [
        ".newsletter"
      ]
    },
    {
      "name": "cards-article-filter",
      "instances": [
        ".contentcategoryfilter"
      ]
    },
    {
      "name": "table-borderless",
      "instances": [
        ".table.parbase"
      ]
    },
    {
      "name": "embed",
      "instances": [
        ".richmedia:has(iframe)"
      ]
    }
  ],
  "autoSections": {
    "selector": "div.hero.responsivegrid, section.section-container, .veevaid__wrapper",
    "styles": {
      "theme-sea-blue": "light-blue",
      "theme-ocean-green": "light-green",
      "theme-true-blue-novo": "dark",
      "bg--green|block--green": "light-green",
      "veevaid__wrapper": "small-print"
    }
  },
  "sections": []
};

const parsers = {
  'hero-photo-bg': heroPhotoBgParser,
  'breadcrumb': breadcrumbParser,
  'cards-stats': cardsStatsParser,
  'cards-video': cardsVideoParser,
  'cards-text': cardsTextParser,
  'cards-photo-cta': cardsPhotoCtaParser,
  'columns': columnsParser,
  'carousel-video': carouselVideoParser,
  'cards-article-slider': cardsArticleSliderParser,
  'columns-media': columnsMediaParser,
  'quiz': quizParser,
  'quiz-poll': quizPollParser,
  'whtr-calculator': whtrCalculatorParser,
  'bmi-calculator': bmiCalculatorParser,
  'columns-locator': columnsLocatorParser,
  'accordion-references': accordionReferencesParser,
  'accordion': accordionParser,
  'pdf-viewer': pdfViewerParser,
  'newsletter': newsletterParser,
  'cards-article-filter': cardsArticleFilterParser,
  'table-borderless': tableBorderlessParser,
  'embed': embedParser,
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
      if (!block.element.parentNode || !main.contains(block.element)) return;
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
