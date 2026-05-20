import { describe, expect, it } from 'vitest';

import { pickDefaultDesignSystemId } from '../../src/raccoonui/default-design-system';

// RACCOONUI-PATCH guard: pins the fork's picker-default invariant so an
// upstream sync cannot silently revert it (memory: git auto-merge can drop a
// fork callsite without a textual conflict). Default order is
// raccoonai -> upstream `default` -> first available -> null when empty.
describe('pickDefaultDesignSystemId (RACCOONUI-PATCH picker default)', () => {
  it('prefers raccoonai when present, regardless of list order', () => {
    expect(
      pickDefaultDesignSystemId([
        { id: 'default' },
        { id: 'vercel' },
        { id: 'raccoonai' },
      ]),
    ).toBe('raccoonai');
  });

  it('falls back to upstream `default` when raccoonai is absent', () => {
    expect(pickDefaultDesignSystemId([{ id: 'vercel' }, { id: 'default' }])).toBe(
      'default',
    );
  });

  it('falls back to the first system when neither raccoonai nor default exist', () => {
    expect(pickDefaultDesignSystemId([{ id: 'vercel' }, { id: 'stripe' }])).toBe(
      'vercel',
    );
  });

  it('returns null when no systems are loaded', () => {
    expect(pickDefaultDesignSystemId([])).toBeNull();
  });
});
