// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstalledPluginRecord, PluginSourceKind, TrustTier } from '@open-design/contracts';
import { PluginsView } from '../../src/components/PluginsView';
import {
  applyPlugin,
  installPluginSource,
  listPluginMarketplaces,
  listPlugins,
  type PluginShareProjectOutcome,
  uploadPluginFolder,
  uploadPluginZip,
} from '../../src/state/projects';

vi.mock('../../src/router', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../src/state/projects', () => ({
  applyPlugin: vi.fn(),
  installPluginSource: vi.fn(),
  listPluginMarketplaces: vi.fn(),
  listPlugins: vi.fn(),
  uninstallPlugin: vi.fn(),
  uploadPluginFolder: vi.fn(),
  uploadPluginZip: vi.fn(),
  upgradePlugin: vi.fn(),
}));

function makePlugin(
  id: string,
  sourceKind: PluginSourceKind,
  trust: TrustTier,
  title = id === 'official-plugin' ? 'Official Plugin' : 'User Plugin',
  description = `${id} description`,
): InstalledPluginRecord {
  return {
    id,
    title,
    version: '1.0.0',
    sourceKind,
    source: '/tmp',
    trust,
    capabilitiesGranted: ['prompt:inject'],
    manifest: {
      name: id,
      version: '1.0.0',
      title: id,
      description,
      od: {
        kind: 'scenario',
        mode: 'prototype',
      },
    },
    fsPath: '/tmp',
    installedAt: 0,
    updatedAt: 0,
  };
}

const mockedListPlugins = vi.mocked(listPlugins);
const mockedListMarketplaces = vi.mocked(listPluginMarketplaces);
const mockedInstallPluginSource = vi.mocked(installPluginSource);
const mockedApplyPlugin = vi.mocked(applyPlugin);
const mockedUploadPluginFolder = vi.mocked(uploadPluginFolder);
const mockedUploadPluginZip = vi.mocked(uploadPluginZip);

beforeEach(() => {
  mockedListPlugins.mockResolvedValue([
    makePlugin('official-plugin', 'bundled', 'bundled'),
    makePlugin('user-plugin', 'github', 'restricted'),
  ]);
  mockedListMarketplaces.mockResolvedValue([
    {
      id: 'catalog-1',
      url: 'https://example.com/open-design-marketplace.json',
      trust: 'official',
      manifest: {
        name: 'Example Catalog',
        plugins: [{ name: 'remote-plugin', source: 'github:owner/repo' }],
      },
    },
  ]);
  mockedInstallPluginSource.mockResolvedValue({
    ok: true,
    plugin: makePlugin('new-plugin', 'github', 'restricted'),
    warnings: [],
    message: 'Installed New Plugin.',
    log: ['Parsing manifest'],
  });
  mockedUploadPluginZip.mockResolvedValue({
    ok: true,
    plugin: makePlugin('zip-plugin', 'user', 'restricted'),
    warnings: [],
    message: 'Installed Zip Plugin.',
    log: [],
  });
  mockedUploadPluginFolder.mockResolvedValue({
    ok: true,
    plugin: makePlugin('folder-plugin', 'user', 'restricted'),
    warnings: [],
    message: 'Installed Folder Plugin.',
    log: [],
  });
  mockedApplyPlugin.mockResolvedValue({
    query: 'Make something.',
    contextItems: [],
    inputs: [],
    assets: [],
    mcpServers: [],
    trust: 'restricted',
    capabilitiesGranted: ['prompt:inject'],
    capabilitiesRequired: ['prompt:inject'],
    appliedPlugin: {
      snapshotId: 'snap-1',
      pluginId: 'official-plugin',
      pluginVersion: '1.0.0',
      manifestSourceDigest: 'a'.repeat(64),
      inputs: {},
      resolvedContext: { items: [] },
      capabilitiesGranted: ['prompt:inject'],
      capabilitiesRequired: ['prompt:inject'],
      assetsStaged: [],
      taskKind: 'new-generation',
      appliedAt: 0,
      connectorsRequired: [],
      connectorsResolved: [],
      mcpServers: [],
      status: 'fresh',
    },
    projectMetadata: {},
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PluginsView', () => {
  it('starts guided plugin creation from the Plugins hero', async () => {
    const onCreatePlugin = vi.fn();
    render(<PluginsView onCreatePlugin={onCreatePlugin} />);

    fireEvent.click(await screen.findByTestId('plugins-create-button'));

    expect(onCreatePlugin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Create or import a plugin' })).toBeNull();
  });

  it('groups official and user-installed plugins while keeping marketplaces coming soon', async () => {
    render(<PluginsView />);

    await waitFor(() => expect(screen.getAllByText('Official Plugin').length).toBeGreaterThan(0));
    expect(screen.queryByText('User Plugin')).toBeNull();

    const myPluginsTab = screen.getByTestId('plugins-tab-mine');
    const marketplacesTab = screen.getByTestId('plugins-tab-marketplaces');
    expect(myPluginsTab.getAttribute('aria-disabled')).toBeNull();
    expect(marketplacesTab.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(myPluginsTab);
    expect(screen.getAllByText('User Plugin').length).toBeGreaterThan(0);
    expect(screen.queryByText('Official Plugin')).toBeNull();
  });

  it('installs from a supported source string', async () => {
    render(<PluginsView />);

    expect(screen.queryByTestId('plugins-tab-import')).toBeNull();
    fireEvent.click(await screen.findByTestId('plugins-import-button'));
    expect(screen.getByRole('dialog', { name: 'Create or import a plugin' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('GitHub, archive, or marketplace source'), {
      target: { value: 'github:owner/repo/plugins/my-plugin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(mockedInstallPluginSource).toHaveBeenCalledWith(
        'github:owner/repo/plugins/my-plugin',
      ),
    );
    expect(await screen.findByText('Installed New Plugin.')).toBeTruthy();
    expect(screen.getByTestId('plugins-tab-mine').getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByText('User Plugin').length).toBeGreaterThan(0);
  });

  it('uploads zip and folder plugins from the import dialog', async () => {
    render(<PluginsView />);

    fireEvent.click(await screen.findByTestId('plugins-import-button'));
    fireEvent.click(screen.getByRole('button', { name: /upload zip/i }));
    const zip = new File(['zip-bytes'], 'plugin.zip', { type: 'application/zip' });
    fireEvent.change(screen.getByTestId('plugins-zip-input'), {
      target: { files: [zip] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(mockedUploadPluginZip).toHaveBeenCalledWith(zip));
    expect(await screen.findByText('Installed Zip Plugin.')).toBeTruthy();

    fireEvent.click(await screen.findByTestId('plugins-import-button'));
    fireEvent.click(screen.getByRole('button', { name: /upload folder/i }));
    const folderFile = new File(['{}'], 'open-design.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('plugins-folder-input'), {
      target: { files: [folderFile] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => expect(mockedUploadPluginFolder).toHaveBeenCalledWith([folderFile]));
    expect(await screen.findByText('Installed Folder Plugin.')).toBeTruthy();
  });

  it('confirms a plugin share action before starting the GitHub repo task', async () => {
    mockedListPlugins.mockResolvedValue([
      makePlugin('official-plugin', 'bundled', 'bundled'),
      makePlugin('user-plugin', 'github', 'restricted'),
      makePlugin(
        'od-plugin-publish-github',
        'bundled',
        'bundled',
        'Publish Plugin to GitHub',
        'Creates a public GitHub repository for a local Open Design plugin using the GitHub CLI.',
      ),
      makePlugin(
        'od-plugin-contribute-open-design',
        'bundled',
        'bundled',
        'Contribute Plugin to Open Design',
        'Opens a pull request that adds a local Open Design plugin to the Open Design community catalog.',
      ),
    ]);
    const onCreatePluginShareProject = vi.fn(async (): Promise<PluginShareProjectOutcome> => ({
      ok: true as const,
      project: {
        id: 'share-project',
        name: 'Publish to GitHub: User Plugin',
        skillId: null,
        designSystemId: null,
        createdAt: 1,
        updatedAt: 1,
        pendingPrompt: 'Publish it',
        metadata: { kind: 'prototype' },
      },
      conversationId: 'conversation-1',
      appliedPluginSnapshotId: 'snapshot-1',
      actionPluginId: 'od-plugin-publish-github',
      sourcePluginId: 'user-plugin',
      stagedPath: 'plugin-source/user-plugin',
      prompt: 'Publish it',
      message: 'Created a Publish to GitHub task.',
    }));

    render(
      <PluginsView
        onCreatePluginShareProject={onCreatePluginShareProject}
      />,
    );

    fireEvent.click(await screen.findByTestId('plugins-tab-mine'));
    const publish = await screen.findByTestId('plugins-home-publish-github-user-plugin');
    expect(publish.textContent).toContain('Publish');
    fireEvent.click(publish);

    const dialog = await screen.findByRole('dialog', {
      name: /Publish Plugin to GitHub for User Plugin/i,
    });
    expect(dialog.textContent).toContain('Creates a public GitHub repository');
    expect(dialog.textContent).toContain('plugin-source/user-plugin');
    expect(onCreatePluginShareProject).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByTestId('plugin-share-confirm-start'));

    await waitFor(() =>
      expect(onCreatePluginShareProject).toHaveBeenCalledWith(
        'user-plugin',
        'publish-github',
        'en',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('plugin-share-confirm-modal')).toBeNull(),
    );
  });
});
