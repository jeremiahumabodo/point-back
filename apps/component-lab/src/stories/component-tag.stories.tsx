import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentTag } from "@pointback/ui";

const meta = {
  title: "PointBack/ComponentTag",
  component: ComponentTag,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ComponentTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { name: "MessageBubble", onRemove: () => {} } };
export const ReplacementTarget: Story = { args: { name: "MessageBubble", selected: true, onRemove: () => {} } };
