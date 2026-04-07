export default function manifest() {
  return {
    name: "Conta Sanlla",
    short_name: "Conta",
    description: "Personal finance manager",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1976d2",
    orientation: "portrait",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
