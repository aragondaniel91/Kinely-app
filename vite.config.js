import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";

          return "vendor";
        },
      },
    },
  },
});
