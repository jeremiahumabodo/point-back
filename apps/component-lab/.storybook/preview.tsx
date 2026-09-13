import type { Preview } from '@storybook/react-vite'
import '../src/main.css'
import '@pointback/ui/styles/main.css'
import MockDate from 'mockdate'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { mswHandlers } from './msw-handlers'

const preview: Preview = {
  decorators: [(Story) => <div id="pointback-root" style={{ font: "14px/1.45 Inter, system-ui, sans-serif" }}><Story /></div>],
  loaders: [mswLoader()],
  async beforeEach({ msw }) {
    msw.use(...mswHandlers)
    MockDate.set('2024-04-01T12:00:00Z')
  },
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;