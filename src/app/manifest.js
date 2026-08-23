export default function manifest() {
  return {
    name: "Conta Sanlla",
    short_name: "Conta",
    description: "Personal finance manager",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F1EBE1",
    theme_color: "#DB5D3B",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
