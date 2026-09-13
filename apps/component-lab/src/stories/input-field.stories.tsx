import type { Meta, StoryObj } from "@storybook/react-vite";
import { InputField } from "@pointback/ui";


const meta = {
  title: "PointBack/InputField",
  component: InputField,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    // sensible default props
  },
} satisfies Meta<typeof InputField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};