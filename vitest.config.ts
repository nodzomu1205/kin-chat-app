import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "hooks/**/*.test.ts",
      "components/panels/gpt/GptDrawerRouterHelpers.test.ts",
      "components/panels/gpt/GptSettingsApprovalState.test.ts",
      "components/panels/gpt/GptSettingsSearchState.test.ts",
      "components/panels/gpt/TaskProgressPanelHelpers.test.ts",
      "components/panels/gpt/LibraryDrawer.test.tsx",
      "components/message/MessageSources.test.tsx",
      "components/message/messageSourcePreview.test.tsx",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
