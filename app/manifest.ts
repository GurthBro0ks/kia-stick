import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KIA Stick",
    short_name: "KIA Stick",
    description: "Fake-doc source-governed local PWA MVP.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f1e6",
    theme_color: "#123f74",
    icons: [
      {
        src: "/kia-stick-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
