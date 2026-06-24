"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@howlwheel/ui/components/alert-dialog";
import { Button } from "@howlwheel/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { controlTrpc, queryClient } from "@/utils/trpc";

export function OverlaysTab() {
	const settingsQ = useQuery(controlTrpc.settings.get.queryOptions());
	const rotate = useMutation(
		controlTrpc.settings.rotateOverlayToken.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(controlTrpc.settings.get.queryFilter());
				toast.success("Overlay token reset — re-copy the URL into OBS.");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const token = settingsQ.data?.overlayToken ?? "";
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const url = token ? `${origin}/overlay?t=${token}` : "";

	return (
		<div className="max-w-2xl space-y-4">
			<div className="panel-card panel-card-rail space-y-4 rounded-2xl p-5">
				<div>
					<h2 className="font-heading text-base font-bold tracking-tight">OBS browser source</h2>
					<p className="mt-1 text-xs/relaxed text-muted-foreground">
						Add this URL as a Browser Source in OBS (1920×1080, transparent). The secret token is the
						overlay&rsquo;s authentication — OBS can&rsquo;t sign in through Cloudflare Access, so anyone
						with this URL can view the wheel. Keep it private; reset it if it leaks.
					</p>
				</div>

				<CopyUrl value={url} />

				<div className="flex items-center justify-between gap-3 border-t border-[var(--glass-stroke)] pt-4">
					<div>
						<p className="text-sm font-semibold">Reset token</p>
						<p className="text-xs text-muted-foreground">
							Rotates the token. Existing OBS sources stop working until re-copied.
						</p>
					</div>
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button variant="destructive" size="lg" disabled={rotate.isPending}>
									<RefreshCw className="size-4" />
									Reset
								</Button>
							}
						/>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Reset the overlay token?</AlertDialogTitle>
								<AlertDialogDescription>
									This invalidates the current overlay URL. Every OBS browser source using it will go
									blank until you paste the new URL. This can&rsquo;t be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => rotate.mutate()}>Reset token</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}

function CopyUrl({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	async function copy() {
		if (!value) return;
		await navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}
	return (
		<div className="flex items-center gap-2">
			<code className="flex-1 overflow-x-auto rounded-lg border border-[var(--glass-stroke)] bg-[rgba(8,18,44,0.6)] px-3 py-2 text-xs whitespace-nowrap text-[#5bc8f0] select-all">
				{value || "…"}
			</code>
			<Button variant="outline" size="lg" className="shrink-0" onClick={copy} disabled={!value}>
				{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
				{copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
