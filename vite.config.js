import { defineConfig, loadEnv } from "vite";
import { cwd } from "process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:5171";
  const crmApiTarget = env.VITE_CRM_API_PROXY_TARGET || "http://localhost:4100";
  const port = Number(env.VITE_PORT || 5172);

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Pre-compress build assets so the server can serve .gz/.br directly.
      viteCompression({ algorithm: "gzip", ext: ".gz" }),
      viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
    ],
    build: {
      rollupOptions: {
        output: {
          // Split the biggest stable vendors into their own long-cacheable
          // chunks so app code changes don't invalidate them.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
              return "vendor-react";
            }
            if (/node_modules\/(@reduxjs\/toolkit|react-redux|redux|redux-thunk|immer|reselect)\//.test(id)) {
              return "vendor-state";
            }
            if (id.includes("node_modules/react-icons/")) {
              return "vendor-icons";
            }
            if (/node_modules\/(jspdf|jspdf-autotable|html2canvas)\//.test(id)) {
              return "vendor-pdf";
            }
            return undefined;
          },
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      // This dev server is intentionally opened from other devices and
      // direct machine IPs, so keep host checks permissive.
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/crm-api": {
          target: crmApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/crm-api/, ""),
        },
      },
    },
  };
});
