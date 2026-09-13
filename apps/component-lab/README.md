# PointBack component lab

Storybook previews and exercises `@pointback/ui`. Components and styles live in `packages/ui`; stories live here in `src/stories`. Do not make the extension depend on this application's source.

Install dependencies once at the repository root, then:

```sh
pnpm storybook
pnpm build-storybook
pnpm test:extension
pnpm --filter component-lab exec vitest run
```

Browser tests require `pnpm --filter component-lab exec playwright install chromium`.

The preview imports the canonical UI stylesheet and retains the existing Tailwind/tokens setup. Tailwind explicitly scans `packages/ui/src`, because shared workspace source lives outside this app.

`tests/extension.integration.test.mjs` loads the real built extension in Chromium and uses a local fixture server. It does not call a coding agent. See the [workspace README](../../README.md) for setup and architecture.
