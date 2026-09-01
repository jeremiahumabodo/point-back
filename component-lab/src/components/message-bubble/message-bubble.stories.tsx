import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageBubble } from "./message-bubble";

const meta = {
  title: "PointBack/MessageBubble",
  component: MessageBubble,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MessageBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const User: Story = {
  args: {
    messageRole: "user",
    author: "You",
    timestamp: "10:42 AM",
    children: "Could you explain why this component rerenders?",
    dieticMode: false
  },
};

export const Assistant: Story = {
  args: {
    messageRole: "assistant",
    author: "Codex",
    timestamp: "10:43 AM",
    children: "I can help investigate that. Let’s start with the component’s props and state changes.",
    dieticMode: false
  },
};
