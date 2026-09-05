import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessagePanel } from "./message-panel";

const meta = {
  title: "PointBack/MessagePanel",
  component: MessagePanel,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    componentName: {
      control: "text",
      description: "The UI component this thread is about.",
    },
    placeholder: {
      control: "text",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MessagePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    componentName: "MessageBubble",
    messages: [],
  },
};

export const Default: Story = {
  args: {
    componentName: "MessageBubble",
    messages: [
      {
        id: "message-1",
        role: "user",
        author: "You",
        timestamp: "10:42 AM",
        content: "Could you explain why this component rerenders?",
      },
      {
        id: "message-2",
        role: "assistant",
        author: "Codex",
        timestamp: "10:43 AM",
        content:
          "I can help investigate that. Let’s start with the component’s props and state changes.",
      },
    ],
  },
};

export const Interactive: Story = {
  args: {
    componentName: "MessageBubble",
    messages: [],
    onSend: () => undefined,
  },
};

export const SelectedComponents: Story = {
  args: {
    componentName: "MessageBubble",
    componentNames: ["MessageBubble", "SendButton"],
    messages: [],
    placeholder: "Type your message here...",
  },
};

export const Dark: Story = {
  args: {
    componentName: "MessageBubble",
    componentNames: ["MessageBubble"],
    dark: true,
    messages: [
      {
        id: "message-1",
        role: "user",
        author: "You",
        timestamp: "10:42 AM",
        content: "Why does this component rerender?",
      },
    ],
  },
};
