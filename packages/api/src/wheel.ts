/**
 * Pure wheel geometry — no DB, no React, no randomness baked in. Shared by the
 * overlay (to animate) and the spin trigger (to pick), and exercised directly by
 * `wheel.test.ts`.
 *
 * Angle convention: degrees measured CLOCKWISE FROM TOP (12 o'clock = 0°). The
 * pointer is fixed at the top (0°). The wheel is rotated by `rotation` degrees
 * clockwise; a slot whose local centre is `c` then appears under the pointer when
 * `(c + rotation) ≡ 0 (mod 360)`.
 */

export type ArcSlot = { weight: number };

export type Arc = {
	/** Slot index in the input array. */
	index: number;
	/** Arc start angle (deg clockwise from top), in the wheel's local frame. */
	start: number;
	/** Arc end angle. */
	end: number;
	/** Arc midpoint angle — what lands under the pointer when chosen. */
	center: number;
	/** Arc sweep in degrees (`360 * weight / totalWeight`). */
	sweep: number;
};

const FULL = 360;
const mod360 = (deg: number) => ((deg % FULL) + FULL) % FULL;

/** Effective weight: clamp to a positive integer so a 0/negative weight can't
 *  collapse a segment or break the cumulative math. */
function w(slot: ArcSlot): number {
	const n = Math.floor(slot.weight);
	return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Compute each slot's arc. Weighted: sweep ∝ weight. Order matches the input
 * array (which the caller has already sorted/filtered to enabled slots).
 */
export function computeArcs(slots: ArcSlot[]): Arc[] {
	const total = slots.reduce((sum, s) => sum + w(s), 0) || 1;
	let cursor = 0;
	return slots.map((s, index) => {
		const sweep = (FULL * w(s)) / total;
		const start = cursor;
		const end = cursor + sweep;
		cursor = end;
		return { index, start, end, center: start + sweep / 2, sweep };
	});
}

/**
 * The wheel rotation (degrees) that lands `targetIndex` under the top pointer,
 * always rotating forward by at least `minTurns` full turns from `current`.
 *
 * Lands on the slot's exact centre — deterministic, so the inverse
 * `slotIndexAtPointer` round-trips it. Visual jitter (if any) is applied
 * separately by the overlay and kept within the arc.
 */
export function finalRotation(
	slots: ArcSlot[],
	targetIndex: number,
	current = 0,
	minTurns = 5,
): number {
	const arcs = computeArcs(slots);
	const arc = arcs[targetIndex];
	if (!arc) throw new RangeError(`targetIndex ${targetIndex} out of range (${arcs.length} slots)`);
	// Want rotation R with (center + R) ≡ 0  ⇒  R ≡ -center (mod 360).
	const want = mod360(-arc.center);
	let target = current - mod360(current) + want;
	while (target < current + minTurns * FULL) target += FULL;
	return target;
}

/**
 * Inverse of the landing math: which slot sits under the top pointer when the
 * wheel is at `rotation`. Used by the landing test and as a runtime sanity check.
 */
export function slotIndexAtPointer(slots: ArcSlot[], rotation: number): number {
	const arcs = computeArcs(slots);
	// Local angle currently under the pointer (top = 0°).
	const local = mod360(-rotation);
	for (const arc of arcs) {
		// `end` of the last arc is 360; treat the wrap so 0 maps to the first arc.
		if (local >= arc.start && local < arc.end) return arc.index;
	}
	return arcs.length - 1;
}

/**
 * Weighted pick. `r` is a uniform random in [0, 1) (injected so callers control
 * randomness and tests stay deterministic). Returns an index into `slots`.
 */
export function pickWeighted(slots: ArcSlot[], r: number): number {
	const weights = slots.map(w);
	const total = weights.reduce((a, b) => a + b, 0);
	if (total <= 0) return 0;
	let threshold = Math.min(Math.max(r, 0), 0.999999999) * total;
	for (let i = 0; i < weights.length; i++) {
		threshold -= weights[i]!;
		if (threshold < 0) return i;
	}
	return weights.length - 1;
}

/** SVG point on a circle at `angleFromTop` degrees (clockwise). */
export function pointOnCircle(cx: number, cy: number, r: number, angleFromTop: number) {
	const rad = ((angleFromTop - 90) * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG path `d` for one pie-slice arc (centre → start edge → arc → close). */
export function arcPath(cx: number, cy: number, r: number, arc: Arc): string {
	const a = pointOnCircle(cx, cy, r, arc.start);
	const b = pointOnCircle(cx, cy, r, arc.end);
	const largeArc = arc.sweep > 180 ? 1 : 0;
	// sweep-flag 1 = clockwise (matches our clockwise-from-top convention).
	return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${largeArc} 1 ${b.x} ${b.y} Z`;
}
