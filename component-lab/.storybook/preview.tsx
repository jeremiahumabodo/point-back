import type { Preview } from '@storybook/react-vite'
import '../src/main.css'
import MockDate from 'mockdate'
import { mswLoader } from 'msw-storybook-addon/csf3'
import { mswHandlers } from './msw-handlers'

const preview: Preview = {
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