// Plugin details modal — preview-kind dispatch contract.
//
// The home gallery routes every plugin tile to a kind-specific
// detail surface (media / html / design-system / scenario fallback)
// so the modal mirrors the affordances of the tile users clicked
// from. This suite locks the dispatch routing through observable
// markers — `data-detail-variant` attributes and surface-specific
// chrome — so a future refactor can not silently collapse two
// variants into one.

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { InstalledPluginRecord } from '@open-design/contracts';

import { PluginDetailsModal } from '../../src/components/PluginDetailsModal';
import { I18nProvider } from '../../src/i18n';

interface MakeArgs {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
  mode?: string;
  preview?: Record<string, unknown>;
  exampleOutputs?: Array<{ path: string; title?: string }>;
  designSystemRef?: string;
  query?: string;
}

function make(args: MakeArgs): InstalledPluginRecord {
  return {
    id: args.id,
    title: args.title ?? args.id,
    version: '0.1.0',
    sourceKind: 'bundled',
    source: '/tmp',
    trust: 'bundled',
    capabilitiesGranted: [],
    manifest: {
      name: args.id,
      version: '0.1.0',
      title: args.title ?? args.id,
      ...(args.description ? { description: args.description } : {}),
      ...(args.tags ? { tags: args.tags } : {}),
      od: {
        kind: 'scenario',
        ...(args.mode ? { mode: args.mode } : {}),
        ...(args.preview ? { preview: args.preview } : {}),
        ...(args.exampleOutputs
          ? { useCase: { exampleOutputs: args.exampleOutputs, query: args.query } }
          : args.query
            ? { useCase: { query: args.query } }
            : {}),
        ...(args.designSystemRef
          ? { context: { designSystem: { ref: args.designSystemRef } } }
          : {}),
      },
    },
    fsPath: '/tmp',
    installedAt: 0,
    updatedAt: 0,
  };
}

function render(record: InstalledPluginRecord): string {
  return renderToStaticMarkup(
    <I18nProvider>
      <PluginDetailsModal record={record} onClose={() => {}} onUse={() => {}} />
    </I18nProvider>,
  );
}

describe('PluginDetailsModal dispatch', () => {
  it('routes image-template plugins to the cinematic media detail surface', () => {
    const html = render(
      make({
        id: 'img-anime',
        title: 'Anime Battle',
        description: 'High-impact illustration generator.',
        preview: { type: 'image', poster: 'https://cdn/anime.jpg' },
        query: 'A dynamic anime-style illustration of {character}.',
      }),
    );
    expect(html).toContain('data-detail-variant="media"');
    expect(html).toContain('plugin-media-detail');
    expect(html).toContain('plugin-share-img-anime');
    expect(html).toContain('plugin-byline-img-anime');
    expect(html).toContain('https://cdn/anime.jpg');
    expect(html).toContain('Anime Battle');
  });

  it('routes video-template plugins to the media detail surface with playable url', () => {
    const html = render(
      make({
        id: 'vid-decade',
        title: 'Glow-Up Video',
        preview: {
          type: 'video',
          poster: 'https://cdn/poster.jpg',
          video: 'https://cdn/clip.mp4',
        },
      }),
    );
    expect(html).toContain('data-detail-variant="media"');
    expect(html).toContain('plugin-media-detail');
    expect(html).toContain('https://cdn/clip.mp4');
    expect(html).toContain('controls');
    expect(html).toContain('plugin-share-vid-decade');
  });

  it('routes html-preview plugins to the example detail (sandboxed iframe + share menu)', () => {
    const html = render(
      make({
        id: 'live-dashboard',
        title: 'Live Dashboard',
        description: 'A Notion-style team dashboard.',
        preview: { type: 'html', entry: './example.html' },
      }),
    );
    expect(html).toContain('ds-modal');
    expect(html).toContain('ds-modal-primary-action');
    expect(html).toContain('plugin-details-use-live-dashboard');
    expect(html).toContain('plugin-share-live-dashboard');
  });

  it('routes design-system plugins to the showcase + DESIGN.md surface (with share menu)', () => {
    const html = render(
      make({
        id: 'ds-airbnb',
        title: 'Airbnb',
        mode: 'design-system',
        designSystemRef: 'airbnb',
      }),
    );
    expect(html).toContain('ds-modal');
    expect(html).toContain('Showcase');
    expect(html).toContain('Tokens');
    expect(html).toContain('DESIGN.md');
    expect(html).toContain('plugin-share-ds-airbnb');
  });

  it('falls back to the scenario inspector when the plugin has no rich preview', () => {
    const html = render(
      make({
        id: 'plain-scenario',
        title: 'Plain Scenario',
        description: 'No preview material.',
        mode: 'prototype',
      }),
    );
    expect(html).toContain('data-detail-variant="scenario"');
    expect(html).toContain('plugin-details-modal__title');
    expect(html).toContain('plugin-share-plain-scenario');
  });
});
