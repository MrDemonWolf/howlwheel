"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { WheelView } from "@/components/overlay/wheel-view";
import { publicTrpc } from "@/utils/trpc";

/**
 * Wheel OBS browser source (transparent). The overlay's auth is the secret
 * `?t=<token>` from the control panel's Overlays tab — OBS can't pass Cloudflare
 * Access. Polls the wheel slowly and the spin channel quickly.
 */
function OverlayInner() {
	const token = useSearchParams().get("t") ?? "";

	const wheel = useQuery({
		...publicTrpc.wheel.getPublic.queryOptions({ token }),
		enabled: token.length > 0,
		refetchInterval: 5000,
		refetchIntervalInBackground: true,
	});
	const poll = useQuery({
		...publicTrpc.spin.poll.queryOptions({ token }),
		enabled: token.length > 0,
		refetchInterval: 1500,
		refetchIntervalInBackground: true,
	});

	if (!token) {
		return (
			<div className="flex h-full w-full items-center justify-center p-8">
				<div className="rounded-2xl border border-[#21345f] bg-[#091533]/95 px-6 py-4 text-center text-sm text-[#9db4d8]">
					Missing overlay token. Append <code className="text-[#5bc8f0]">?t=&lt;token&gt;</code> from the
					control panel&rsquo;s Overlays tab.
				</div>
			</div>
		);
	}

	return <WheelView slots={wheel.data ?? []} pending={poll.data ?? null} />;
}

export default function OverlayPage() {
	return (
		<div className="@container fixed inset-0 overflow-hidden bg-transparent">
			<Suspense>
				<OverlayInner />
			</Suspense>
		</div>
	);
}
