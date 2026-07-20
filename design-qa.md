# Design QA

## Evidence

- Approved desktop reference: `/Users/allardvanhelbergen/code/shambawi-timer/docs/superpowers/specs/assets/2026-07-20-still-water-desktop.png`
- Approved mobile reference: `/Users/allardvanhelbergen/code/shambawi-timer/docs/superpowers/specs/assets/2026-07-20-still-water-mobile.png`
- Implementation URL: `http://localhost:4173/`
- Repository welcome screenshot: `/Users/allardvanhelbergen/code/shambawi-timer/docs/shambawi-timer.png`
- Desktop welcome implementation: `/tmp/shambawi-welcome-768x1024-final.png`
- Mobile welcome implementation: `/tmp/shambawi-welcome-390x844-final.png`
- Desktop completed implementation: `/tmp/shambawi-completed-768x1024-final.png`
- Mobile completed implementation: `/tmp/shambawi-completed-mobile-tone-test.png`
- Desktop welcome comparison: `/tmp/shambawi-desktop-welcome-comparison-final.png`
- Mobile welcome comparison: `/tmp/shambawi-mobile-welcome-comparison-final.png`
- Desktop completed comparison: `/tmp/shambawi-desktop-completed-comparison-v2.png`
- Mobile completed comparison: `/tmp/shambawi-mobile-completed-comparison-v2.png`
- Practice regression screenshots: `/tmp/shambawi-practice-1536x1024-final.png` and `/tmp/shambawi-practice-360x800-final.png`
- Ceremony comparison viewports: desktop `768x1024`; mobile `390x844`
- Practice verification viewports: desktop `1536x1024`; mobile `390x844` and `360x800`
- States: welcome, running round 1, completed, and immediate practice restart
- Focused region comparison: not needed. The normalized full-view pairs keep the headings, actions, waterline, ripples, and complete botanical crop legible.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Typography: fixed `48px` desktop and `30px` mobile ceremony headings fit without clipping; practice hierarchy and tabular timer numerals remain intact.
- Layout: ceremony states occupy one viewport; mobile practice keeps all seven rounds above the timer and all controls inside the viewport without scrolling.
- Palette: all six supplied colors remain represented as visual-system tokens and are applied consistently to text, controls, progress, focus, and illustration treatment.
- Illustration: the Still Water ripple bitmap and transparent botanical branch render at native quality with a subtle reflection and no visible image rectangles.
- Interaction hierarchy: welcome exposes one circular Start action; completed exposes one Practice again action; practice retains the existing controls and information architecture.
- Accessibility: semantic sibling regions use native `hidden`; keyboard controls retain visible focus, while programmatically focused headings do not show a pointer-style ring; reduced motion disables ripple animation.

## Comparison History

1. Initial desktop comparison placed the ceremony content and waterline too high.
   - Severity: P2 composition mismatch.
   - Fix: moved the content group and scene down and corrected the leaf anchor.
2. Rapidly activating Start clicked through to a round-list item after the view swap.
   - Severity: P1 interaction regression.
   - Fix: added a `450ms` practice-entry pointer guard while preserving one-click timer start.
3. Mobile practice showed opaque leaf rectangles and a browser outline on the programmatically focused round title.
   - Severity: P2 visual regressions.
   - Fix: switched all decoration to the transparent leaf asset and removed focus outlines only from `tabindex="-1"` phase headings.
4. The mirrored completed-state branch was transformed outside the viewport.
   - Severity: P2 illustration crop failure.
   - Fix: mirrored around `center bottom`; the branch and reflection now remain visible on desktop and mobile.
5. The transparent source alpha made the branch nearly disappear against the page background.
   - Severity: P2 hierarchy mismatch.
   - Fix: applied a palette-safe tonal filter and multiply blend, then repeated all four full-view comparisons.

## Functional Verification

- Initial load shows only Start Shambawi and its Start control.
- One Start activation opens Butterfly with the timer running and the practice control labelled Pause.
- Reset returns directly to welcome; rapid double activation does not create a second timer or click through to another round.
- Natural completion was exercised through an isolated shortened-timing localhost copy; it showed Shambawi completed, and Practice again immediately restarted Butterfly with Pause active.
- Seven rounds, previous, next, pause, reset, Bell, and Voice remain visible and usable.
- `390x844` and `360x800` have no horizontal or vertical overflow in welcome or practice.
- The wide desktop practice view at `1536x1024` has no overflow.
- Browser console warnings and errors: none.
- The temporary completion preview server was stopped and its files were removed after verification.

## Accepted P3 Differences

- The `96px` desktop and `72px` mobile Start controls are intentionally smaller than the generated concept because the approved written specification defines those dimensions.
- The reused botanical branch has a different silhouette from the generated reference foliage; its side, orientation, crop, and visual weight match the selected direction.

final result: passed
