import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "GABU",
        short_name: "GABU",
        description: "Gestión de bienes de uso",
        start_url: "/",
        display: "standalone",
        background_color: "#CDD5D8",
        theme_color: "#071739",
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
