import { useState } from "react";
import { HistoryList } from "../conversation-panes/conversation-panes";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeicticReference } from "../deictic-reference";
import { MessageBubble } from "../message-bubble";
import { PointBackPanel } from "./pointback-panel";

const meta = {
  title: "PointBack/PointBackPanel",
  component: PointBackPanel,
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: 580 } },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PointBackPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: {} };
export const SelectedComponents: Story = {
  args: {
    componentNames: ["MessageBubble", "SendButton"],
    children: (
      <MessageBubble author="You" messageRole="user" timestamp="10:42 AM">
        I am thinking about <DeicticReference linked term="this" /> component.
      </MessageBubble>
    ),
  },
};
export const Dark: Story = {
  args: { componentNames: ["MessageBubble"], dark: true },
};
export const Settings: Story = { args: { pane: "settings" } };
export const SettingsError: Story = {
  args: {
    pane: "settings",
    settingsStatus: "Use http://127.0.0.1:3000 or another loopback port.",
  },
};
export const History: Story = {
  args: {
    pane: "history",
    historyContent: (
      <HistoryList
        threads={[
          {
            id: "example",
            title: "Why does this component rerender?",
            updatedAt: "2024-04-01T12:00:00Z",
          },
        ]}
        onOpen={() => {}}
      />
    ),
  },
};
export const Streaming: Story = {
  args: {
    busy: true,
    children: (
      <MessageBubble messageRole="assistant" metadata="Assistant · Working…">
        Inspecting the selected component…
      </MessageBubble>
    ),
  },
};

function InteractivePanel() {
  const [dark, setDark] = useState(false);
  const [pane, setPane] = useState<"conversation" | "settings" | "history">(
    "conversation",
  );
  const [components, setComponents] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [references, setReferences] = useState(true);
  return (
    <PointBackPanel
      dark={dark}
      pane={pane}
      componentNames={components}
      canSend={!!draft.trim()}
      onToggleTheme={() => setDark(!dark)}
      onOpenSettings={() => setPane("settings")}
      onOpenHistory={() => setPane("history")}
      onBack={() => setPane("conversation")}
      onSelectComponents={() =>
        setComponents([...components, "ExampleComponent"])
      }
      onRemoveComponent={(index) =>
        setComponents(components.filter((_, i) => i !== index))
      }
      onNewChat={() => {
        setMessages([]);
        setComponents([]);
      }}
      deicticMode={references}
      onToggleReferences={() => setReferences(!references)}
      editorProps={{
        onInput: (event) => setDraft(event.currentTarget.innerText),
      }}
      onSend={(event) => {
        event.preventDefault();
        if (!draft.trim()) return;
        setMessages([...messages, draft.trim()]);
        event.currentTarget.querySelector(".pb-input")?.replaceChildren();
        setDraft("");
      }}
      onSaveSettings={(event) => {
        event.preventDefault();
        setPane("conversation");
      }}
    >
      {messages.length
        ? messages.map((message, index) => (
            <MessageBubble key={index} messageRole="user" timestamp="10:42 AM">
              {message}
            </MessageBubble>
          ))
        : undefined}
    </PointBackPanel>
  );
}
export const Interactive: Story = { render: () => <InteractivePanel /> };
