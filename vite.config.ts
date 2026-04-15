import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // CRITICAL FIX: Force ALL imports of React (from any package, including
      // sub-dependencies) to resolve to the exact same physical file.
      // resolve.dedupe works only in dev; this alias works in both dev AND
      // the Rollup production build, preventing the "useState of null" error.
      "react":     path.resolve(__dirname, "./node_modules/react/index.js"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom/index.js"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
    },
    // Keep dedupe as belt-and-suspenders for dev HMR
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime"],
    // Force Vite pre-bundler to use the same React instance
    force: false,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Explicitly tell Rollup these are external-to-chunks singletons
      // so it never duplicates them across manual chunks
      output: {
        manualChunks(id) {
          // React ecosystem — always one chunk, never split
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // Router
          if (id.includes("node_modules/react-router-dom/") || id.includes("node_modules/react-router/")) {
            return "vendor-router";
          }
          // UI libraries
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3")) {
            return "vendor-charts";
          }
        },
      },
    },
  },
});
