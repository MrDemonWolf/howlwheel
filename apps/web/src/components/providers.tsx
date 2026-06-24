"use client";

import { Toaster } from "@howlwheel/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/utils/trpc";

/**
 * Howlwheel ships one fixed dark brand theme (no theme switcher), so the only
 * provider we need is React Query. The Toaster is invisible until a toast fires,
 * so it's harmless on the transparent overlay route.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{/* Fixed dark brand theme — override sonner's next-themes default (no ThemeProvider mounted). */}
			<Toaster theme="dark" richColors position="top-center" />
		</QueryClientProvider>
	);
}
