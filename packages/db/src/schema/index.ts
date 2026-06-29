import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One wheel slot (a "dare"). Slots are ordered by `order`; the overlay renders
 * enabled slots as weighted arcs. `weight` scales a slot's arc size and its odds
 * in a random spin. `color` is an optional hex override (else a palette colour).
 */
export const slots = sqliteTable("slots", {
	id: text("id").primaryKey(),
	// SQL column is `sort_order` — `order` is a reserved word in SQLite.
	order: integer("sort_order").notNull(),
	label: text("label").notNull(),
	weight: integer("weight").notNull().default(1),
	color: text("color"),
	enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

/** Spin history. One row per `spin.trigger`, newest first by `at`. */
export const spins = sqliteTable("spins", {
	id: text("id").primaryKey(),
	slotId: text("slot_id").notNull(),
	label: text("label").notNull(),
	at: integer("at")
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Singleton config row (id = "default"):
 *  - `overlayToken` — secret the OBS overlay must present (`?t=`). Lazy-seeded.
 *  - `pendingSpin`  — JSON `{ spinId, targetIndex, at }` the overlay polls and
 *    animates to, or null once consumed. The overlay's only "live" channel.
 */
export const settings = sqliteTable("settings", {
	id: text("id").primaryKey(),
	overlayToken: text("overlay_token").notNull(),
	pendingSpin: text("pending_spin"),
});

export type SlotRow = typeof slots.$inferSelect;
export type SpinRow = typeof spins.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
