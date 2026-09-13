import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    resolve: { dedupe: ["react", "react-dom"] },
    esbuild: { jsx: "automatic" },
  }),
  manifest: {
    permissions: ["storage"],
    host_permissions: ["http://127.0.0.1/*", "http://[::1]/*"],
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    action: {
      default_title: "Activate PointBack",
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
        48: "icon/48.png",
        128: "icon/128.png",
      },
    },
    name: "PointBack",
    description:
      "Start coding-agent conversations from the UI you are inspecting.",
  },
});
