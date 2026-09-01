import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessagePanel } from "./message-panel";

const meta = {
  title: "PointBack/MessagePanel",
  component: MessagePanel,
  parameters: {
    layout: "centered",
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
