"use client";

import { useState } from "react";

import { OverlaysTab } from "@/components/control/overlays-tab";
import { SlotsTab } from "@/components/control/slots-tab";

type Tab = "wheel" | "overlays";

export default function ControlPage() {
	const [tab, setTab] = useState<Tab>("wheel");

	return (
		<div className="space-y-6">
			<div>
				<p className="eyebrow text-xs">Operator</p>
				<h1 className="font-heading text-2xl font-extrabold tracking-tight">Control panel</h1>
			</div>

			<div className="segmented inline-flex gap-1 rounded-xl p-1">
				<TabButton active={tab === "wheel"} onClick={() => setTab("wheel")}>
					Wheel
				</TabButton>
				<TabButton active={tab === "overlays"} onClick={() => setTab("overlays")}>
					Overlays
				</TabButton>
			</div>

			{tab === "wheel" ? <SlotsTab /> : <OverlaysTab />}
		</div>
	);
}

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
				active ? "segmented-on text-white" : "text-muted-foreground hover:text-foreground"
			}`}
		>
			{children}
		</button>
	);
}
