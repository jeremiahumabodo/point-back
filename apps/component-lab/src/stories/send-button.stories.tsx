import type { Meta, StoryObj } from "@storybook/react-vite";
import { SendButton } from "@pointback/ui";

const meta = {
  title: "PointBack/SendButton",
  component: SendButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SendButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
