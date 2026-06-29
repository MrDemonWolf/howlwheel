import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import type { Db } from "@howlwheel/db";
import * as schema from "@howlwheel/db";
import { drizzle } from "drizzle-orm/bun-sqlite";

import { protectedRouter, publicRouter } from "./routers/index";
import { seedDefaultSlots } from "./seed";
import { finalRotation, slotIndexAtPointer } from "./wheel";

// Schema mirror (kept in lockstep with packages/db/src/schema). A drift here
// fails loudly, which is what we want from a fixture.
const DDL = `
CREATE TABLE slots (
  id text PRIMARY KEY NOT NULL,
  sort_order integer NOT NULL,
  label text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  color text,
  enabled integer NOT NULL DEFAULT 1
);
CREATE TABLE spins (
  id text PRIMARY KEY NOT NULL,
  slot_id text NOT NULL,
  label text NOT NULL,
  at integer NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE settings (
  id text PRIMARY KEY NOT NULL,
  overlay_token text NOT NULL,
  pending_spin text
);
`;

function makeDb(): Db {
	const sqlite = new Database(":memory:");
	sqlite.exec(DDL);
	return drizzle(sqlite, { schema }) as unknown as Db;
}

let db: Db;
let pub: ReturnType<typeof publicRouter.createCaller>;
let op: ReturnType<typeof protectedRouter.createCaller>;

beforeEach(() => {
	db = makeDb();
	pub = publicRouter.createCaller({ db, user: null });
	op = protectedRouter.createCaller({ db, user: { email: "dev@test" } });
});

async function seedSlots() {
	await op.slots.upsert({ label: "10 push-ups", weight: 1 });
	await op.slots.upsert({ label: "free spin", weight: 3 });
	await op.slots.upsert({ label: "embarrassing story", weight: 2 });
	await op.slots.upsert({ label: "disabled dare", weight: 1, enabled: false });
}

describe("public surface never leaks the token or internal fields", () => {
	test("getPublic returns render fields only, omits disabled slots", async () => {
		await seedSlots();
		const { overlayToken } = await op.settings.get();

		const wheel = await pub.wheel.getPublic({ token: overlayToken });
		expect(wheel).toHaveLength(3); // disabled one excluded
		for (const s of wheel) {
			expect(Object.keys(s).sort()).toEqual(["color", "label", "order", "weight"]);
			// no id, no `enabled`, no token-ish fields
			expect(s).not.toHaveProperty("id");
			expect(s).not.toHaveProperty("enabled");
		}
		// the secret token must not appear anywhere in the public payload
		expect(JSON.stringify(wheel)).not.toContain(overlayToken);
	});

	test("getPublic rejects a wrong/empty token", async () => {
		await seedSlots();
		await expect(pub.wheel.getPublic({ token: "deadbeef" })).rejects.toThrow();
		await expect(pub.wheel.getPublic({ token: "" })).rejects.toThrow();
	});

	test("spin.poll requires a valid token and never returns the token", async () => {
		await seedSlots();
		const { overlayToken } = await op.settings.get();
		await expect(pub.spin.poll({ token: "nope" })).rejects.toThrow();

		const empty = await pub.spin.poll({ token: overlayToken });
		expect(empty).toBeNull();

		await op.spin.trigger({});
		const pending = await pub.spin.poll({ token: overlayToken });
		expect(pending).not.toBeNull();
		expect(JSON.stringify(pending)).not.toContain(overlayToken);
		// pendingSpin carries only the animation fields
		expect(Object.keys(pending!).sort()).toEqual(["at", "spinId", "targetIndex"]);
	});

	test("rotating the token invalidates the old one", async () => {
		await seedSlots();
		const { overlayToken: oldToken } = await op.settings.get();
		const { overlayToken: newToken } = await op.settings.rotateOverlayToken();
		expect(newToken).not.toBe(oldToken);
		expect(newToken).toHaveLength(32);
		await expect(pub.wheel.getPublic({ token: oldToken })).rejects.toThrow();
		await expect(pub.wheel.getPublic({ token: newToken })).resolves.toBeDefined();
	});
});

describe("overlay lands on the server-chosen slot index", () => {
	test("explicit pick: pendingSpin.targetIndex maps to the chosen slot", async () => {
		await seedSlots();
		const { overlayToken } = await op.settings.get();
		const slots = await op.slots.list();
		const target = slots.find((s) => s.label === "embarrassing story")!;

		const result = await op.spin.trigger({ slotId: target.id });

		const wheel = await pub.wheel.getPublic({ token: overlayToken });
		// The overlay would compute this rotation and animate to it.
		const rotation = finalRotation(wheel, result.targetIndex);
		const landed = slotIndexAtPointer(wheel, rotation);
		expect(landed).toBe(result.targetIndex);
		// and the slot the overlay shows under the pointer is the chosen one
		expect(wheel[landed]!.label).toBe("embarrassing story");
	});

	test("random pick: server index always matches the overlay's slot mapping", async () => {
		await seedSlots();
		const { overlayToken } = await op.settings.get();

		for (let i = 0; i < 30; i++) {
			const result = await op.spin.trigger({});
			const wheel = await pub.wheel.getPublic({ token: overlayToken });
			expect(result.targetIndex).toBeGreaterThanOrEqual(0);
			expect(result.targetIndex).toBeLessThan(wheel.length);
			const rotation = finalRotation(wheel, result.targetIndex);
			expect(slotIndexAtPointer(wheel, rotation)).toBe(result.targetIndex);
			// the index the server returned names the same slot the overlay shows
			expect(wheel[result.targetIndex]!.label).toBe(result.slot.label);
		}
	});

	test("trigger with no enabled slots is rejected", async () => {
		await expect(op.spin.trigger({})).rejects.toThrow();
	});
});

describe("default seeding is idempotent (concurrent first-access safe)", () => {
	test("seeding twice yields 10 slots with unique orders", async () => {
		await Promise.all([seedDefaultSlots(db), seedDefaultSlots(db)]);
		const rows = await op.slots.list();
		expect(rows).toHaveLength(10);
		expect(new Set(rows.map((r) => r.order)).size).toBe(10);
	});

	test("editing a slot clears any pending spin", async () => {
		await seedSlots();
		const { overlayToken } = await op.settings.get();
		await op.spin.trigger({});
		expect(await pub.spin.poll({ token: overlayToken })).not.toBeNull();
		const slot = (await op.slots.list())[0]!;
		await op.slots.upsert({ id: slot.id, label: slot.label, weight: 2 });
		expect(await pub.spin.poll({ token: overlayToken })).toBeNull();
	});
});
