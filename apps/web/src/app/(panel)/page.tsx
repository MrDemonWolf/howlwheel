import Link from "next/link";

import { WolfMark } from "@/components/wolf-mark";

export default function HomePage() {
	return (
		<div className="mx-auto max-w-2xl">
			<div className="panel-card panel-card-rail rounded-3xl p-8">
				<WolfMark className="size-14" />
				<p className="eyebrow mt-5 text-xs">Wheel of dares</p>
				<h1 className="font-heading mt-1 text-4xl font-extrabold tracking-tight">Howlwheel</h1>
				<p className="mt-3 max-w-prose text-sm/relaxed text-muted-foreground">
					A self-hosted wheel-of-dares spinner for Twitch streams. Manage the wheel from the
					operator panel; an OBS browser source renders the wheel and animates a spin to the result
					on cue.
				</p>
				<div className="mt-6 flex flex-wrap items-center gap-3">
					<Link
						href="/control"
						className="rounded-[0.6rem] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_14px_-5px_rgba(0,172,237,0.6)] transition hover:brightness-110"
					>
						Open control panel
					</Link>
					<span className="text-xs text-muted-foreground">
						Grab the tokenized overlay URL from the panel&rsquo;s <strong>Overlays</strong> tab.
					</span>
				</div>
			</div>
		</div>
	);
}
