// Faceted categorisation hook for the Plugins home section.
//
// Replaces the older single-row scenario-tag hook with a 3-axis
// SURFACE / TYPE / SCENARIO model. Filters compose via AND across
// axes (selecting Web + Slides + Marketing shows only plugins that
// match all three). Each axis selection is independent so the user
// can dial scope in / out one dimension at a time.
//
// A small "Featured" toggle sits orthogonally to the facets — when
// active it overrides the facet selection and just shows the
// curator-promoted plugins. We intentionally make Featured override
// rather than AND-compose so a featured pick is never accidentally
// hidden behind a still-selected facet pill.

import { useEffect, useMemo, useState } from 'react';
import type { InstalledPluginRecord } from '@open-design/contracts';
import {
  applyFacetSelection,
  buildFacetCatalog,
  filterByQuery,
  isFeaturedPlugin,
  resolveDefaultSelection,
  type FacetAxis,
  type FacetCatalog,
  type FacetSelection,
} from './facets';
import { sortByVisualAppeal } from './visualScore';

export type FilterMode = 'all' | 'featured';

interface UsePluginFacetsArgs {
  plugins: InstalledPluginRecord[];
}

export interface UsePluginFacetsResult {
  visiblePlugins: InstalledPluginRecord[];
  featuredList: InstalledPluginRecord[];
  filtered: InstalledPluginRecord[];
  catalog: FacetCatalog;
  selection: FacetSelection;
  pickFacet: (axis: FacetAxis, slug: string | null) => void;
  clearFacets: () => void;
  hasActiveFacet: boolean;
  mode: FilterMode;
  setMode: (next: FilterMode) => void;
  query: string;
  setQuery: (next: string) => void;
  totalVisible: number;
}

const EMPTY_SELECTION: FacetSelection = {
  surface: null,
  type: null,
  scenario: null,
};

export function usePluginFacets(args: UsePluginFacetsArgs): UsePluginFacetsResult {
  const [mode, setMode] = useState<FilterMode>('all');
  const [selection, setSelection] = useState<FacetSelection>(EMPTY_SELECTION);
  const [query, setQuery] = useState('');
  // Apply the preferred default selection once, on the first render that
  // sees a non-empty catalog. Using a flag (instead of a useState lazy
  // initializer) handles the realistic case where `args.plugins` is
  // empty at first paint and arrives a tick later.
  const [bootstrapped, setBootstrapped] = useState(false);

  // Atoms are infrastructure pieces (`code-import`, `patch-edit`) that
  // are not user-facing on the home grid; the original section already
  // filtered them out and we preserve that contract. We immediately
  // sort by visual-appeal score so the first viewport leads with the
  // cinematic decks / image / video templates rather than alphabetical
  // bundled noise. Featured plugins get a +1000 score boost inside the
  // sort so they stay anchored to the front of every facet view.
  const visiblePlugins = useMemo(
    () =>
      sortByVisualAppeal(
        args.plugins.filter((p) => p.manifest?.od?.kind !== 'atom'),
      ),
    [args.plugins],
  );

  const featuredList = useMemo(
    () => visiblePlugins.filter(isFeaturedPlugin),
    [visiblePlugins],
  );

  const catalog = useMemo(() => buildFacetCatalog(visiblePlugins), [visiblePlugins]);

  useEffect(() => {
    if (bootstrapped) return;
    if (visiblePlugins.length === 0) return;
    const next = resolveDefaultSelection(catalog);
    if (next.surface !== null || next.type !== null || next.scenario !== null) {
      setSelection(next);
    }
    setBootstrapped(true);
  }, [bootstrapped, visiblePlugins.length, catalog]);

  // The visual-appeal sort is applied at `visiblePlugins` derivation
  // (above), so any downstream `applyFacetSelection` slice preserves
  // the ranking. We do not re-sort here because filter + featured
  // override should both remain stable across selections.
  const filtered = useMemo(() => {
    const base =
      mode === 'featured'
        ? featuredList
        : applyFacetSelection(visiblePlugins, selection);
    return filterByQuery(base, query);
  }, [mode, featuredList, visiblePlugins, selection, query]);

  function pickFacet(axis: FacetAxis, slug: string | null): void {
    if (mode === 'featured') setMode('all');
    setSelection((prev) => ({
      ...prev,
      [axis]: prev[axis] === slug ? null : slug,
    }));
  }

  function clearFacets(): void {
    setSelection(EMPTY_SELECTION);
    setQuery('');
  }

  const hasActiveFacet =
    selection.surface !== null ||
    selection.type !== null ||
    selection.scenario !== null ||
    query.trim().length > 0;

  return {
    visiblePlugins,
    featuredList,
    filtered,
    catalog,
    selection,
    pickFacet,
    clearFacets,
    hasActiveFacet,
    mode,
    setMode,
    query,
    setQuery,
    totalVisible: visiblePlugins.length,
  };
}
