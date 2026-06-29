import { type Db, slots } from "@howlwheel/db";

/**
 * The 2026 wheel-of-dares. Seeded once, when a fresh database first creates its
 * settings row (see `store.readSettings`). Colours are saturated brand-adjacent
 * hues that pair with the overlay's white labels; the operator can recolour or
 * reweight any slot from the control panel afterwards.
 */
export const DEFAULT_SLOTS: { label: string; weight: number; color: string }[] = [
	{ label: "10 push-ups", weight: 1, color: "#00aced" },
	{ label: "20 jumping jacks", weight: 1, color: "#1e5bbf" },
	{ label: "1-min dance break", weight: 1, color: "#6d3bd1" },
	{ label: "Embarrassing story", weight: 1, color: "#b3308e" },
	{ label: "Chat picks next game", weight: 1, color: "#c0392b" },
	{ label: "Chat picks title (15 min)", weight: 1, color: "#d35400" },
	{ label: "Best villain laugh", weight: 1, color: "#117a65" },
	{ label: "Draw sona badly (60s)", weight: 1, color: "#2c7a2c" },
	{ label: "Draw chat's request", weight: 1, color: "#8e44ad" },
	{ label: "Free spin", weight: 1, color: "#2c3e76" },
];

/**
 * Insert the default dares (used on first-run seeding). Idempotent: deterministic
 * `slot-N` ids + `onConflictDoNothing` so two concurrent first-access requests
 * (e.g. the overlay's batched `wheel.getPublic` + `spin.poll`) can't double-seed.
 */
export async function seedDefaultSlots(db: Db): Promise<void> {
	const rows = DEFAULT_SLOTS.map((s, order) => ({
		id: `slot-${order}`,
		order,
		label: s.label,
		weight: s.weight,
		color: s.color,
		enabled: true,
	}));
	await db.insert(slots).values(rows).onConflictDoNothing();
}
