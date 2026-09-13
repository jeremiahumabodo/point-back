import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReferenceButton } from "@pointback/ui";

const meta = {
  title: "PointBack/ReferenceButton",
  component: ReferenceButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ReferenceButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { active: true } };
export const Inactive: Story = { args: { active: false } };
export const Disabled: Story = { args: { disabled: true } };
