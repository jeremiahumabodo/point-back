import {
  ComponentTag,
  DeicticReference,
  EmptyConversation,
  HistoryList,
  MessageBubble,
  PointBackPanel,
  SelectionOverlay,
} from "@pointback/ui";
import type { ReactNode } from "react";
import type { Message } from "../application/state";
import type { PointBackApplication } from "../application/use-pointback";
import { ResolvedComponentDetails } from "./component-details";

function MessageContent({
  message,
  actions,
}: {
  message: Message;
  actions: PointBackApplication["actions"];
}) {
  const content: ReactNode[] = [];
  let cursor = 0;
  for (const reference of [...message.references].sort(
    (left, right) => left.start - right.start,
  )) {
    content.push(message.content.slice(cursor, reference.start));
    content.push(
      <DeicticReference
        key={reference.id}
        linked
        term={message.content.slice(reference.start, reference.end)}
        onPointerEnter={() => actions.showReferences(reference.targets)}
        onPointerLeave={actions.hideReferences}
      />,
    );
    cursor = reference.end;
  }
  content.push(message.content.slice(cursor));
  return <>{content}</>;
}

/** One React tree. Application state flows down as props, interactions flow up. */
export function PointBackRoot({
  state,
  actions,
  inspection,
  tooltip,
}: PointBackApplication) {
  const busy = !!state.sending;
  return (
    <>
      <SelectionOverlay
        mode={state.selection?.mode}
        onCancel={actions.cancelSelection}
        tooltip={tooltip}
        details={
          inspection ? (
            <ResolvedComponentDetails footprint={inspection.footprint} />
          ) : undefined
        }
        detailsStyle={
          inspection
            ? { left: inspection.left, top: inspection.top }
            : undefined
        }
      />
      <PointBackPanel
        hidden={!state.open}
        dark={state.dark}
        pane={state.pane}
        busy={busy}
        title={state.title}
        componentNames={state.selected.map(
          (component) => component.footprint.name,
        )}
        selecting={state.selection?.mode === "add"}
        componentContent={state.selected.map((component) => (
          <ComponentTag
            key={component.id}
            name={`<${component.footprint.tagName}>`}
            removeLabel={component.footprint.name}
            selected={component.id === state.selection?.replacement}
            disabled={busy}
            title={`Replace <${component.footprint.tagName}>. Hold Ctrl or ⌘ to inspect resolved attributes.`}
            onPointerEnter={(event) =>
              actions.hoverChip(
                component.id,
                event.currentTarget,
                event.ctrlKey || event.metaKey,
              )
            }
            onPointerLeave={actions.leaveChip}
            onFocus={(event) =>
              actions.hoverChip(component.id, event.currentTarget)
            }
            onBlur={actions.leaveChip}
            onClick={() => actions.replace(component.id)}
            onRemove={() => actions.remove(component.id)}
            onKeyDown={(event) => {
              if (event.key === "Delete") {
                event.preventDefault();
                actions.remove(component.id);
              }
            }}
          />
        ))}
        canSend={!!state.composer.text.trim()}
        onClose={actions.close}
        onToggleTheme={actions.toggleTheme}
        onSelectComponents={actions.select}
        onOpenSettings={actions.settings}
        onOpenHistory={actions.history}
        onBack={actions.back}
        onNewChat={actions.newChat}
        onStop={actions.stop}
        onSend={(event) => {
          event.preventDefault();
          actions.send();
        }}
        onSaveSettings={(event) => {
          event.preventDefault();
          void actions.saveSettings();
        }}
        settingsStatus={state.settings.status}
        settingsFields={{ ...state.settings, onChange: actions.updateSettings }}
        deicticMode={state.deicticMode}
        onToggleReferences={actions.toggleReferences}
        historyContent={
          state.history.status || (
            <HistoryList
              threads={state.history.threads}
              loadingId={state.history.loadingId}
              onOpen={actions.openThread}
            />
          )
        }
        editorProps={{
          onInput: (event) => {
            if (
              !(event.nativeEvent instanceof InputEvent) ||
              !event.nativeEvent.isComposing
            )
              actions.edit();
          },
          onCompositionEnd: actions.edit,
          onKeyDown: (event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              actions.send();
            }
          },
        }}
      >
        {state.messages.length ? (
          state.messages.map((message) => (
            <MessageBubble
              key={message.id}
              messageRole={message.role}
              metadata={message.metadata}
            >
              <MessageContent message={message} actions={actions} />
            </MessageBubble>
          ))
        ) : (
          <EmptyConversation selectedCount={state.selected.length} />
        )}
      </PointBackPanel>
    </>
  );
}
