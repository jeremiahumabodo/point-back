import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeicticReference } from "./deictic-reference";

const meta = {
  title: "PointBack/DeicticReference",
  component: DeicticReference,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DeicticReference>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unlinked: Story = { args: { term: "this" } };
export const Active: Story = { args: { term: "this", active: true } };
export const Linked: Story = { args: { term: "these", linked: true } };
