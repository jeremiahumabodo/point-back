# Conversation boundaries

Application policy and state now live in React's `application/` layer, not mutable DOM controllers. See [UI ownership](../ui/README.md).

The remaining plain TypeScript modules have narrow responsibilities:

| Module | Responsibility |
| --- | --- |
| `conversation-state.ts` | Target-agnostic reference descriptors and plural-reference predicate |
| `reconcile-references.ts` | Pure token identity reconciliation and released-handle calculation |
| `reference-editor.ts` | Native editable DOM, caret ranges, token rendering; no draft ownership |
| `stream-controller.ts` | Product event forwarding, cancellation, terminal/disposal guards; no rendering |
| `panel-behavior.ts` | Panel dragging geometry only |

`application/state.ts` owns selection/link policy and conversation transitions. Draft references use opaque string handles; live page Elements stay in `selection/browser-mechanics.ts`. Requests contain resolved footprints, never handles or Elements.

An accepted send clears the draft; an unconfirmed delivery retains it. New chat/history restoration resets composer state. Saved footprints remain context without being presented as live DOM identities. Stream actions are scoped to their assistant message ID, so a stale response cannot overwrite another conversation.

## Checks

- `pnpm --filter pointback-browser-extension test`: reducer, reference reconciliation, and stream lifetime regressions.
- `pnpm typecheck`: workspace types.
- `pnpm test:extension`: built MV3 integration (selection, inspection, references, settings, streaming, history, dragging, lasso, cancellation).
