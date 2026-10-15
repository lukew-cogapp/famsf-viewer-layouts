import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	// Relative, so the build works under the GitHub Pages subpath.
	base: "./",
	plugins: [react(), tailwindcss()],
});
