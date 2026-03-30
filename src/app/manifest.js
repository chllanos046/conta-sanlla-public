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
      { src: "/icon", sizes: "any", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
