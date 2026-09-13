# Extension UI ownership

```text
browser mechanics (pointer / resolver / bridge)
        ↓ events
application/ (React reducer + lifecycle effects)
        ↓
PointBackRoot
        ↓ props
@pointback/ui
```

- `bootstrap/start-pointback.tsx` mounts/disposes one React root in an open Shadow DOM.
- `application/state.ts` owns panel visibility, pane, selection descriptors, messages, sending state, thread context, history/settings state, and composer text/reference handles. Transitions are pure and unit tested.
- `application/use-pointback.ts` adapts browser/transport events into reducer actions and owns subscriptions through React effects. `PointBackApp.tsx` passes the resulting state/actions to `PointBackRoot.tsx`.
- `PointBackRoot.tsx` renders messages, selection chips, settings, history, and overlays through props. There are no nested React roots, imperative UI controllers, or streaming text refs.
- `selection/browser-mechanics.ts` owns live page `Element` references behind opaque IDs, hit-testing integration, outlines, geometry, and inspection anchors. Only normalized footprints and IDs enter application state. React never resolves Fiber or stores page Elements.
- Bridge and stream transport remain plain TypeScript. They emit product events and know nothing about message nodes or UI rendering. Effects dispose subscriptions, cancel unfinished responses, and ignore obsolete async results.
- Persisted footprints are evidence, not live page identities. No new anchor-matching algorithm is introduced; any future matching belongs behind the browser mechanics boundary.

## Editing event boundary

`isolate-editing-events.ts` stops keyboard, input, composition, and clipboard events from bubbling beyond the ShadowRoot. React's root handlers run first; native default actions are not cancelled. This prevents page-wide bubbling shortcuts from mistaking the shadow host for a non-editable target and stealing focus. It also covers the settings inputs without blocking intentional typing in the page itself.

This does not intercept page capture-phase listeners that run before the event reaches the shadow tree, nor prevent a page from explicitly calling `focus()`. Do not add a global focus trap or blanket `preventDefault` workaround.

## Explicit DOM islands

React owns the reference editor host and **all composer state**. Native editing owns its descendants, selection ranges, and IME behavior. `reference-editor.ts` reads native input events and renders the React draft with `@pointback/ui/editor`; do not render React children inside the editable host.

Empty highlight containers and the lasso are geometry-only islands owned by browser mechanics. Panel dragging and custom scrollbars similarly mutate only layout geometry. They must never change pane visibility, messages, busy state, or composer policy. Everything else renders normally through React.

Shared components import no browser APIs, extension storage, bridge code, or agent internals. Shared styles are `@pointback/ui/styles/main.css`; intentional page cursor/outline effects stay in `assets/content.css`.

Document events are retargeted to the shadow host: exclude it from page selection. Focus is read from `shadow.activeElement`; native editor selection uses Chromium's shadow selection API with a window fallback. Firefox and selection inside page-owned shadow trees are not newly supported. Shadow DOM isolates styles, **not secrets from a hostile page**.

Run `pnpm typecheck`, `pnpm test:extension`, and `pnpm build-storybook` from the workspace root. Browser tests exercise the built MV3 extension with a fixture bridge, not a real coding agent.
