# Shared UI integration

The extension renders components directly from `component-lab/src/components`.
`entrypoints/content.tsx` mounts a static React shell inside an open Shadow DOM.
`component-lab/src/components/styles/extension.css` is the canonical stylesheet,
ported from the original extension appearance. Storybook loads the same stylesheet.
Only the intentional page cursor and selection-outline effects remain in
`browser-extension/assets/content.css`.

## Ownership

- **Component lab:** panel, buttons, component tags, message bubbles, reference
  presentation/editor host, settings/history panes, selection overlays and details.
  Components accept props and callbacks; they do not import extension or agent APIs.
- **Extension:** DOM targeting/resolution, selection identities, bridge messaging,
  storage, conversation orchestration and page-coordinate positioning.
- **`content-controller.tsx`:** the original interaction behavior, adapted to render
  shared views. This is intentionally still an imperative controller, not a full
  React state-management rewrite.
- **`react-slots.tsx`:** explicit integration boundary. React owns slot children;
  the controller owns visibility, positioning and designated editable/streaming
  refs. The shell is mounted once and **must not be re-rendered over those slots**.
  Clear slots with `slots.clear`, not `replaceChildren`, so their React roots are
  unmounted. Teardown unregisters global handlers, cancels the stream and disposes
  roots. A future declarative controller can remove this boundary independently.
- **Reference editor:** React owns the host, native editing owns its descendants.
  `reference-editor-dom.ts` builds reference presentation using the same class-name
  definition as the React reference component. The controller supplies identities
  and browser actions. Do not render React children inside the editable host.

The old lab-only `MessagePanel` is now a convenience wrapper around the canonical
`PointBackPanel`, not a second panel implementation. Retired component styles were
removed to avoid maintaining two appearances.

## Shadow DOM assumptions

Document-level events are retargeted to the host. Exclude the host from page
selection and use `composedPath()` for extension-internal inspection. Focus is read
from `shadow.activeElement`, and editor selection uses Chromium's shadow selection
API (with a window fallback). The current browser integration test targets Chromium;
Firefox behavior has not been verified. Shadow DOM isolates styles, **not secrets
from a hostile page**. Page shadow-tree traversal is not newly supported by this
migration.

## Verification

Install dependencies in both applications with `pnpm install`, then:

```sh
cd browser-extension
pnpm typecheck
pnpm build
cd ../component-lab
pnpm build
pnpm lint
pnpm build-storybook
pnpm exec playwright install chromium
pnpm test:extension
```

The integration test loads the real built MV3 extension in Chromium against a local
fixture bridge. It exercises host-style isolation, selection/lasso, replacement and
removal, inspection, shadow-aware caret/reference editing, multiline text, drag,
settings validation, streaming, cancellation, failed-delivery draft retention,
history and conversation reset. It does not invoke a real coding agent.
