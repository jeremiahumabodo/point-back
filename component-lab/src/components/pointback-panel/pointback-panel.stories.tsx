import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeicticReference } from "../deictic-reference";
import { MessageBubble } from "../message-bubble";
import { PointBackPanel } from "./pointback-panel";

const meta = {
  title: "PointBack/PointBackPanel",
  component: PointBackPanel,
  parameters: { layout: "centered" },
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
export const Dark: Story = { args: { componentNames: ["MessageBubble"], dark: true } };
