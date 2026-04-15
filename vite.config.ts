import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
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
    },
    // Esta es la forma CORRECTA de evitar el error de "useState of null"
    // Obliga a Vite a usar una única instancia de React sin romper las rutas de archivos
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Esto asegura que las dependencias se pre-empaqueten correctamente
    include: ["react", "react-dom"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Mantenemos la separación por chunks para mejorar la carga en Vercel
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/recharts")) {
            return "vendor-charts";
          }
        },
      },
    },
  },
});
