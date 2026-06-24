import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router } from "../index";
import { listEnabledSlots, readSettings, verifyOverlayToken } from "../store";

const tokenInput = z.object({ token: z.string().min(1) });

/** A slot as the overlay sees it — render fields only. No id, no `enabled`,
 *  and critically never the overlay token or any settings field. */
export type PublicSlot = { order: number; label: string; color: string | null; weight: number };

/**
 * The only API surface the public overlay can reach. Every procedure requires a
 * valid overlay token (the overlay's auth — OBS can't pass Cloudflare Access).
 * Responses carry render data only; the token and internal ids never leave here.
 */
export const publicRouter = router({
	wheel: router({
		getPublic: publicProcedure.input(tokenInput).query(async ({ ctx, input }): Promise<PublicSlot[]> => {
			if (!(await verifyOverlayToken(ctx.db, input.token))) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid overlay token." });
			}
			const enabled = await listEnabledSlots(ctx.db);
			return enabled.map((s) => ({
				order: s.order,
				label: s.label,
				color: s.color,
				weight: s.weight,
			}));
		}),
	}),
	spin: router({
		/**
		 * Latest pending spin (or null). The overlay polls this and animates to
		 * `targetIndex` when `spinId` changes. NOT cleared on read, so multiple OBS
		 * sources stay in sync and a reload re-shows the last result.
		 */
		poll: publicProcedure.input(tokenInput).query(async ({ ctx, input }) => {
			if (!(await verifyOverlayToken(ctx.db, input.token))) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid overlay token." });
			}
			const { pendingSpin } = await readSettings(ctx.db);
			return pendingSpin;
		}),
	}),
});

export type PublicRouter = typeof publicRouter;
