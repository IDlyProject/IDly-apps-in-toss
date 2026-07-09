import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "breach-response",
  brand: {
    displayName: "유출·해킹 응급실",
    primaryColor: "#3b6cff",
    icon: "https://cnatfppqjgqygdefbufn.supabase.co/storage/v1/object/public/assets/idly_icon_navy_square_600x600.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
