import { describe, expect, test } from "bun:test";

import { computeArcs, finalRotation, pickWeighted, slotIndexAtPointer } from "./wheel";

const configs: { name: string; weights: number[] }[] = [
	{ name: "uniform 10", weights: Array(10).fill(1) },
	{ name: "weighted mix", weights: [1, 5, 2, 1, 3] },
	{ name: "two slots", weights: [1, 1] },
	{ name: "lopsided", weights: [10, 1, 1] },
	{ name: "single", weights: [1] },
	{ name: "many uneven", weights: [1, 2, 3, 4, 5, 6, 7] },
];

describe("computeArcs", () => {
	test("sweeps are weight-proportional and cover 360°", () => {
		const slots = [{ weight: 1 }, { weight: 3 }]; // total 4
		const arcs = computeArcs(slots);
		expect(arcs[0]!.sweep).toBeCloseTo(90);
		expect(arcs[1]!.sweep).toBeCloseTo(270);
		expect(arcs[arcs.length - 1]!.end).toBeCloseTo(360);
	});

	test("non-positive weights are clamped to 1", () => {
		const arcs = computeArcs([{ weight: 0 }, { weight: -4 }]);
		expect(arcs[0]!.sweep).toBeCloseTo(180);
		expect(arcs[1]!.sweep).toBeCloseTo(180);
	});
});

describe("finalRotation lands on the chosen index", () => {
	for (const { name, weights } of configs) {
		test(name, () => {
			const slots = weights.map((weight) => ({ weight }));
			for (let i = 0; i < slots.length; i++) {
				// from a few different starting rotations
				for (const current of [0, 37, 360, 1234.5]) {
					const r = finalRotation(slots, i, current, 5);
					// always spins forward by at least 5 full turns
					expect(r).toBeGreaterThanOrEqual(current + 5 * 360);
					// and the slot under the pointer afterwards is exactly i
					expect(slotIndexAtPointer(slots, r)).toBe(i);
				}
			}
		});
	}

	test("out-of-range index throws", () => {
		expect(() => finalRotation([{ weight: 1 }], 3)).toThrow(RangeError);
	});
});

describe("pickWeighted", () => {
	test("r=0 picks first, r→1 picks last", () => {
		const slots = [{ weight: 1 }, { weight: 1 }, { weight: 1 }];
		expect(pickWeighted(slots, 0)).toBe(0);
		expect(pickWeighted(slots, 0.999999)).toBe(2);
	});

	test("respects weight boundaries", () => {
		const slots = [{ weight: 1 }, { weight: 3 }]; // cut at 0.25
		expect(pickWeighted(slots, 0.1)).toBe(0);
		expect(pickWeighted(slots, 0.24)).toBe(0);
		expect(pickWeighted(slots, 0.26)).toBe(1);
		expect(pickWeighted(slots, 0.9)).toBe(1);
	});

	test("uniform spread roughly matches weights", () => {
		const slots = [{ weight: 1 }, { weight: 4 }]; // expect ~20% / ~80%
		const counts = [0, 0];
		const N = 20000;
		for (let i = 0; i < N; i++) counts[pickWeighted(slots, (i + 0.5) / N)]!++;
		expect(counts[0]! / N).toBeCloseTo(0.2, 1);
		expect(counts[1]! / N).toBeCloseTo(0.8, 1);
	});
});
