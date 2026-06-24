import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
	addSpin,
	clearPendingSpin,
	listEnabledSlots,
	listSlots,
	listSpins,
	readSettings,
	removeSlot,
	reorderSlots,
	rotateOverlayToken,
	setPendingSpin,
	upsertSlot,
} from "../store";
import { pickWeighted } from "../wheel";

const MAX_LABEL = 80;

// 3/4/6/8-digit hex, or null/empty to clear.
const colorSchema = z
	.string()
	.regex(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Use a hex colour like #00ACED.")
	.nullish();

const slotInput = z.object({
	id: z.string().optional(),
	label: z.string().trim().min(1, "Label required.").max(MAX_LABEL),
	weight: z.number().int().min(1).max(1000).optional(),
	color: colorSchema,
	enabled: z.boolean().optional(),
	order: z.number().int().nonnegative().optional(),
});

/**
 * Operator-only API. Every procedure requires a Cloudflare Access user.
 */
export const protectedRouter = router({
	slots: router({
		list: protectedProcedure.query(({ ctx }) => listSlots(ctx.db)),

		// Editing the wheel invalidates any pending spin: its `targetIndex` is a
		// position into the enabled list, which a label/weight/enable/order change
		// can shift. Clear it so the overlay can't land on a now-wrong slot.
		upsert: protectedProcedure.input(slotInput).mutation(async ({ ctx, input }) => {
			const row = await upsertSlot(ctx.db, { ...input, label: input.label.trim() });
			await clearPendingSpin(ctx.db);
			return row;
		}),

		remove: protectedProcedure
			.input(z.object({ id: z.string() }))
			.mutation(async ({ ctx, input }) => {
				await removeSlot(ctx.db, input.id);
				await clearPendingSpin(ctx.db);
				return { ok: true as const };
			}),

		reorder: protectedProcedure
			.input(z.object({ ids: z.array(z.string()).min(1) }))
			.mutation(async ({ ctx, input }) => {
				await reorderSlots(ctx.db, input.ids);
				await clearPendingSpin(ctx.db);
				return listSlots(ctx.db);
			}),
	}),

	settings: router({
		/** The operator needs the token to build the OBS URL. */
		get: protectedProcedure.query(async ({ ctx }) => {
			const { overlayToken } = await readSettings(ctx.db);
			return { overlayToken };
		}),
		rotateOverlayToken: protectedProcedure.mutation(async ({ ctx }) => {
			const overlayToken = await rotateOverlayToken(ctx.db);
			return { overlayToken };
		}),
	}),

	spin: router({
		history: protectedProcedure.query(({ ctx }) => listSpins(ctx.db)),

		/**
		 * Trigger a spin. With `slotId`, lands on that slot; without, picks a
		 * weighted-random enabled slot server-side. Writes a history row and the
		 * `pendingSpin` channel so the overlay animates to `targetIndex`.
		 */
		trigger: protectedProcedure
			.input(z.object({ slotId: z.string().optional() }))
			.mutation(async ({ ctx, input }) => {
				const enabled = await listEnabledSlots(ctx.db);
				if (enabled.length === 0) {
					throw new TRPCError({ code: "BAD_REQUEST", message: "No enabled slots to spin." });
				}
				let targetIndex: number;
				if (input.slotId) {
					targetIndex = enabled.findIndex((s) => s.id === input.slotId);
					if (targetIndex === -1) {
						throw new TRPCError({ code: "BAD_REQUEST", message: "Slot not found or disabled." });
					}
				} else {
					targetIndex = pickWeighted(enabled, Math.random());
				}
				const slot = enabled[targetIndex]!;
				const spinId = await addSpin(ctx.db, slot.id, slot.label);
				const at = Date.now();
				await setPendingSpin(ctx.db, { spinId, targetIndex, at });
				return { spinId, targetIndex, slot: { id: slot.id, label: slot.label }, at };
			}),

		/** Clear the pending spin (resets the overlay to idle). */
		clear: protectedProcedure.mutation(async ({ ctx }) => {
			await clearPendingSpin(ctx.db);
			return { ok: true as const };
		}),
	}),
});

export type ProtectedRouter = typeof protectedRouter;
