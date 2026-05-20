// RACCOONUI-PATCH: prefer raccoonai design system as default (internal fork) — 2026-05-02
//
// Centralizes the fork's picker-default invariant out of the App.tsx hot zone.
// Keeping it here (a) lets a unit test pin the behavior and (b) shrinks the
// App.tsx merge surface to a single import + call, so an upstream sync that
// rewrites the surrounding effect cannot silently drop the preference.

/**
 * Pick the design system to select when the user has no stored choice.
 *
 * Fork invariant: `raccoonai` wins; otherwise fall back to upstream `default`,
 * then the first available system. Returns `null` only when no systems are
 * loaded yet, so the caller can bail without touching config.
 */
export function pickDefaultDesignSystemId(
  designSystems: readonly { id: string }[],
): string | null {
  if (designSystems.length === 0) return null;
  return (
    designSystems.find((d) => d.id === 'raccoonai')?.id
    ?? designSystems.find((d) => d.id === 'default')?.id
    ?? designSystems[0]!.id
  );
}
