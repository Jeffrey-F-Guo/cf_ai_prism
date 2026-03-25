import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import decorators from "./src/decorators";

export default defineConfig({
  plugins: [decorators(), react(), cloudflare(), tailwindcss()]
});
