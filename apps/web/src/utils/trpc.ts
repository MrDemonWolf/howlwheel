import type { ProtectedRouter, PublicRouter } from "@howlwheel/api/routers/index";
import { env } from "@howlwheel/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
	defaultOptions: {
		// Avoid hammering protected endpoints when Access isn't configured yet.
		queries: { retry: 1, refetchOnWindowFocus: false },
	},
	queryCache: new QueryCache({
		onError: (error) => {
			// "Cloudflare Access required" is expected until Access is set up, and
			// "Invalid overlay token" spams the public overlay — don't toast either.
			if (error.message.includes("Cloudflare Access")) return;
			if (error.message.includes("overlay token")) return;
			toast.error(error.message);
		},
	}),
});

/**
 * Public client → the overlay Worker (`apps/server`). Token-gated, open. Used by
 * `/overlay` (the OBS browser source).
 */
const publicClient = createTRPCClient<PublicRouter>({
	links: [httpBatchLink({ url: `${env.NEXT_PUBLIC_SERVER_URL}/trpc` })],
});

export const publicTrpc = createTRPCOptionsProxy<PublicRouter>({
	client: publicClient,
	queryClient,
});

/**
 * Operator client → same-origin `/api/trpc` route handler, which sits behind
 * Cloudflare Access. Same-origin + `credentials: "include"` so the Access cookie
 * and `Cf-Access-Jwt-Assertion` header ride along. Used by `/control`.
 */
const controlClient = createTRPCClient<ProtectedRouter>({
	links: [
		httpBatchLink({
			url: "/api/trpc",
			fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
		}),
	],
});

export const controlTrpc = createTRPCOptionsProxy<ProtectedRouter>({
	client: controlClient,
	queryClient,
});
