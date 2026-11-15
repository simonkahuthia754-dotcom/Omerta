import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// chrome61 is the oldest WebView Capacitor 6 supports; esbuild lowers newer syntax and CSS (inset, etc.) for it.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", target: "chrome61", cssTarget: "chrome61" },
});
