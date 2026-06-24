import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Howlwheel",
		short_name: "Howlwheel",
		description: "Wheel of dares spinner for Twitch streams",
		start_url: "/",
		display: "standalone",
		background_color: "#091533",
		theme_color: "#00aced",
		icons: [
			{
				src: "/favicon/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/favicon/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	};
}
