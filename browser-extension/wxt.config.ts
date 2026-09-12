import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    resolve: { dedupe: ["react", "react-dom"] },
    esbuild: { jsx: "automatic" },
  }),
  manifest: {
    permissions: ["storage"],
    host_permissions: ["http://127.0.0.1/*", "http://[::1]/*"],
    action: {
      default_title: "Activate PointBack",
    },
    name: "PointBack",
    description:
      "Start coding-agent conversations from the UI you are inspecting.",
  },
});
