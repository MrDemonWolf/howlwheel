import { type Db, type SlotRow, settings, slots, spins } from "@howlwheel/db";
import { asc, desc, eq } from "drizzle-orm";

import { seedDefaultSlots } from "./seed";

/** Singleton id for the settings row. */
const SETTINGS_ID = "default";

export type PendingSpin = {
	/** id of the `spins` row this animation corresponds to. */
	spinId: string;
	/** index into the enabled-slots list (ordered by `order` asc) to land on. */
	targetIndex: number;
	/** ms epoch the spin was triggered — overlay uses it to detect new spins. */
	at: number;
};

export type Settings = { overlayToken: string; pendingSpin: PendingSpin | null };

/** 32-char (16-byte) hex token. */
function genToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function parseSettings(row: typeof settings.$inferSelect): Settings {
	return {
		overlayToken: row.overlayToken,
		pendingSpin: row.pendingSpin ? (JSON.parse(row.pendingSpin) as PendingSpin) : null,
	};
}

/** Read the settings row, lazy-seeding a token on first access. */
export async function readSettings(db: Db): Promise<Settings> {
	let row = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
	if (!row) {
		await db
			.insert(settings)
			.values({ id: SETTINGS_ID, overlayToken: genToken(), pendingSpin: null })
			.onConflictDoNothing();
		row = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
		// Fresh database — seed the default dares once, alongside the settings row.
		const existing = await db.select({ id: slots.id }).from(slots).limit(1).all();
		if (existing.length === 0) await seedDefaultSlots(db);
	}
	return parseSettings(row!);
}

/** Replace the overlay token with a fresh one (old OBS URLs stop working). */
export async function rotateOverlayToken(db: Db): Promise<string> {
	await readSettings(db); // ensure the row exists
	const overlayToken = genToken();
	await db.update(settings).set({ overlayToken }).where(eq(settings.id, SETTINGS_ID));
	return overlayToken;
}

/**
 * Constant-time-ish token check. Length is fixed/public so comparing it is fine;
 * the byte loop avoids a short-circuit timing oracle on the secret bytes.
 */
export async function verifyOverlayToken(db: Db, token: string | undefined): Promise<boolean> {
	if (!token) return false;
	const { overlayToken } = await readSettings(db);
	if (token.length !== overlayToken.length) return false;
	let diff = 0;
	for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ overlayToken.charCodeAt(i);
	return diff === 0;
}

export async function setPendingSpin(db: Db, pending: PendingSpin): Promise<void> {
	await readSettings(db);
	await db
		.update(settings)
		.set({ pendingSpin: JSON.stringify(pending) })
		.where(eq(settings.id, SETTINGS_ID));
}

export async function clearPendingSpin(db: Db): Promise<void> {
	await db.update(settings).set({ pendingSpin: null }).where(eq(settings.id, SETTINGS_ID));
}

// ---- slots -----------------------------------------------------------------

export function listSlots(db: Db): Promise<SlotRow[]> {
	return db.select().from(slots).orderBy(asc(slots.order)).all();
}

export function listEnabledSlots(db: Db): Promise<SlotRow[]> {
	return db.select().from(slots).where(eq(slots.enabled, true)).orderBy(asc(slots.order)).all();
}

export type SlotInput = {
	id?: string;
	label: string;
	weight?: number;
	color?: string | null;
	enabled?: boolean;
	order?: number;
};

/** Insert or update a slot. New slots append to the end unless `order` given. */
export async function upsertSlot(db: Db, input: SlotInput): Promise<SlotRow> {
	if (input.id) {
		const existing = await db.select().from(slots).where(eq(slots.id, input.id)).get();
		if (existing) {
			const next: Partial<SlotRow> = { label: input.label };
			if (input.weight !== undefined) next.weight = input.weight;
			if (input.color !== undefined) next.color = input.color;
			if (input.enabled !== undefined) next.enabled = input.enabled;
			if (input.order !== undefined) next.order = input.order;
			await db.update(slots).set(next).where(eq(slots.id, input.id));
			return (await db.select().from(slots).where(eq(slots.id, input.id)).get())!;
		}
	}
	const all = await listSlots(db);
	const order = input.order ?? (all.length ? Math.max(...all.map((s) => s.order)) + 1 : 0);
	const row: SlotRow = {
		id: input.id ?? crypto.randomUUID(),
		order,
		label: input.label,
		weight: input.weight ?? 1,
		color: input.color ?? null,
		enabled: input.enabled ?? true,
	};
	await db.insert(slots).values(row);
	return row;
}

export async function removeSlot(db: Db, id: string): Promise<void> {
	await db.delete(slots).where(eq(slots.id, id));
}

/** Set each slot's `order` to its position in `ids`. */
export async function reorderSlots(db: Db, ids: string[]): Promise<void> {
	for (let i = 0; i < ids.length; i++) {
		await db.update(slots).set({ order: i }).where(eq(slots.id, ids[i]!));
	}
}

// ---- spins (history) -------------------------------------------------------

export async function addSpin(db: Db, slotId: string, label: string): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(spins).values({ id, slotId, label });
	return id;
}

export function listSpins(db: Db, limit = 25) {
	return db.select().from(spins).orderBy(desc(spins.at)).limit(limit).all();
}
