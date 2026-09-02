import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentSelectorButton } from "./component-selector-button";

const meta = {
  title: "PointBack/ComponentSelectorButton",
  component: ComponentSelectorButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof ComponentSelectorButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const Active: Story = { args: { active: true } };
