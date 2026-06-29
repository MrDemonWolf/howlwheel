"use client";

import type { PublicSlot } from "@howlwheel/api/routers/index";
import type { PendingSpin } from "@howlwheel/api/store";
import { arcPath, computeArcs, finalRotation, pointOnCircle, slotIndexAtPointer } from "@howlwheel/api/wheel";
import { useEffect, useRef, useState } from "react";

const SIZE = 440;
const C = SIZE / 2;
const R = 200;
const LABEL_R = 128;

// Fallback palette for slots without an explicit colour (cycled by index).
const PALETTE = ["#00aced", "#1e5bbf", "#6d3bd1", "#b3308e", "#c0392b", "#117a65", "#d35400", "#2c7a2c"];

const clampIndex = (i: number, len: number) => Math.max(0, Math.min(i, len - 1));

/**
 * The wheel. Renders weighted SVG segments and animates an eased multi-turn spin
 * that lands the chosen slot under the top pointer. Idle and spinning states are
 * visually distinct; the result sits on an opaque navy backing for OBS legibility.
 */
export function WheelView({ slots, pending }: { slots: PublicSlot[]; pending: PendingSpin | null }) {
	const [rotation, setRotation] = useState(0);
	const [spinning, setSpinning] = useState(false);
	const [result, setResult] = useState<string | null>(null);
	// `view` is the geometry actually rendered + animated against. It tracks the
	// server EXCEPT while a spin is in flight — freezing it so a mid-spin slot
	// edit can't shift the arcs out from under the running transition.
	const [view, setView] = useState<PublicSlot[]>(slots);
	const initialized = useRef(false);
	const lastSpinId = useRef<string | null>(null);

	// Sync the rendered geometry to the server when idle; freeze it while spinning.
	useEffect(() => {
		if (!spinning) setView(slots);
	}, [slots, spinning]);

	useEffect(() => {
		if (slots.length === 0) return;
		const pid = pending?.spinId ?? null;

		// First data we ever see: adopt it as the baseline. If a spin was already
		// pending (overlay loaded mid-stream), show that result statically rather
		// than replaying the animation.
		if (!initialized.current) {
			initialized.current = true;
			lastSpinId.current = pid;
			if (pending) {
				const idx = clampIndex(pending.targetIndex, slots.length);
				setView(slots);
				setRotation(finalRotation(slots, idx, 0, 0));
				setResult(slots[idx]?.label ?? null);
			}
			return;
		}

		// A genuinely new spin → freeze this geometry and animate to it.
		if (!pid || pid === lastSpinId.current) return;
		lastSpinId.current = pid;
		const base = slots;
		const idx = clampIndex(pending!.targetIndex, base.length);
		setView(base);
		setResult(null);
		setSpinning(true);
		setRotation((r) => finalRotation(base, idx, r, 6));
	}, [pending?.spinId, slots]);

	function onSpinEnd() {
		if (!spinning) return;
		setSpinning(false);
		// Derive the landed slot from the frozen geometry the wheel actually animated.
		if (view.length) setResult(view[slotIndexAtPointer(view, rotation)]?.label ?? null);
	}

	const arcs = computeArcs(view);
	const empty = view.length === 0;

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-[3cqh] p-[4cqmin]">
			<div className="relative aspect-square w-[min(72cqh,72cqw)]">
				<svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible">
					<defs>
						<filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
							<feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.55" />
						</filter>
					</defs>

					{/* rotating wheel */}
					<g
						style={{
							transform: `rotate(${rotation}deg)`,
							transformOrigin: "50% 50%",
							transition: spinning ? "transform 5.2s cubic-bezier(0.16, 0.84, 0.3, 1)" : "none",
						}}
						onTransitionEnd={onSpinEnd}
						filter="url(#wheelShadow)"
					>
						<circle cx={C} cy={C} r={R} fill="#0c1b40" stroke="#21345f" strokeWidth="2" />
						{arcs.map((arc) => {
							const slot = view[arc.index]!;
							const fill = slot.color ?? PALETTE[arc.index % PALETTE.length]!;
							const flip = arc.center > 90 && arc.center < 270;
							const lp = pointOnCircle(C, C, LABEL_R, arc.center);
							return (
								<g key={arc.index}>
									<path d={arcPath(C, C, R, arc)} fill={fill} stroke="#091533" strokeWidth="2" />
									<g transform={`rotate(${arc.center} ${C} ${C})`}>
										<text
											x={C}
											y={C - LABEL_R}
											transform={flip ? `rotate(180 ${C} ${C - LABEL_R})` : undefined}
											textAnchor="middle"
											dominantBaseline="middle"
											fontSize="15"
											fontWeight="700"
											fill="#ffffff"
											stroke="rgba(0,0,0,0.55)"
											strokeWidth="3"
											paintOrder="stroke"
											style={{ fontFamily: "var(--font-heading, sans-serif)" }}
										>
											{slot.label}
										</text>
									</g>
									<line {...lineToEdge(arc.start)} stroke="#091533" strokeWidth="2" />
								</g>
							);
						})}
						{/* hub */}
						<circle cx={C} cy={C} r="26" fill="#091533" stroke="#00aced" strokeWidth="3" />
					</g>

					{/* fixed pointer at top, pointing into the wheel */}
					<polygon
						points={`${C - 18},6 ${C + 18},6 ${C},44`}
						fill="#5bc8f0"
						stroke="#091533"
						strokeWidth="3"
						filter="url(#wheelShadow)"
					/>
				</svg>
			</div>

			{/* status / result — opaque navy backing, AA-safe */}
			<div className="min-h-[10cqh] flex items-center justify-center">
				{empty ? (
					<Banner tone="muted">Add slots in the control panel</Banner>
				) : spinning ? (
					<Banner tone="spinning">Spinning…</Banner>
				) : result ? (
					<Banner tone="result">{result}</Banner>
				) : (
					<Banner tone="idle">Ready to spin</Banner>
				)}
			</div>
		</div>
	);
}

function lineToEdge(angle: number) {
	const p = pointOnCircle(C, C, R, angle);
	return { x1: C, y1: C, x2: p.x, y2: p.y };
}

function Banner({
	tone,
	children,
}: {
	tone: "result" | "spinning" | "idle" | "muted";
	children: React.ReactNode;
}) {
	const base =
		"rounded-2xl border px-[5cqw] py-[2cqh] text-center font-heading text-[4.5cqh] font-extrabold whitespace-nowrap shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)]";
	const tones = {
		result: "animate-wolf-pop wolf-glow border-[#00aced]/60 bg-[#091533] text-[#5bc8f0]",
		spinning: "border-[#5bc8f0]/40 bg-[#091533]/95 text-white",
		idle: "border-[#21345f] bg-[#091533]/90 text-[#9db4d8]",
		muted: "border-[#21345f] bg-[#091533]/90 text-[#9db4d8]",
	} as const;
	return <div className={`${base} ${tones[tone]}`}>{children}</div>;
}
