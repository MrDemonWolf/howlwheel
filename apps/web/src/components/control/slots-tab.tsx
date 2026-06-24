"use client";

import type { SlotRow } from "@howlwheel/db";
import { Button } from "@howlwheel/ui/components/button";
import { Checkbox } from "@howlwheel/ui/components/checkbox";
import { Input } from "@howlwheel/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GripVertical, Loader2, Play, Plus, Shuffle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { controlTrpc, queryClient } from "@/utils/trpc";

const invalidateSlots = () =>
	queryClient.invalidateQueries(controlTrpc.slots.list.queryFilter());
const invalidateHistory = () =>
	queryClient.invalidateQueries(controlTrpc.spin.history.queryFilter());

export function SlotsTab() {
	const slotsQ = useQuery(controlTrpc.slots.list.queryOptions());
	const historyQ = useQuery(controlTrpc.spin.history.queryOptions());
	const [newLabel, setNewLabel] = useState("");
	const [dragId, setDragId] = useState<string | null>(null);

	const add = useMutation(
		controlTrpc.slots.upsert.mutationOptions({
			onSuccess: () => {
				setNewLabel("");
				invalidateSlots();
			},
			onError: (e) => toast.error(e.message),
		}),
	);
	const reorder = useMutation(
		controlTrpc.slots.reorder.mutationOptions({
			onSuccess: () => invalidateSlots(),
			onError: (e) => toast.error(e.message),
		}),
	);
	const spin = useMutation(
		controlTrpc.spin.trigger.mutationOptions({
			onSuccess: (res) => {
				toast.success(`🎯 ${res.slot.label}`);
				invalidateHistory();
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const slots = slotsQ.data ?? [];

	function onDrop(targetId: string) {
		if (!dragId || dragId === targetId) return;
		const ids = slots.map((s) => s.id);
		const from = ids.indexOf(dragId);
		const to = ids.indexOf(targetId);
		if (from === -1 || to === -1) return;
		ids.splice(to, 0, ids.splice(from, 1)[0]!);
		setDragId(null);
		reorder.mutate({ ids });
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<section className="space-y-3">
				{/* spin + add */}
				<div className="panel-card panel-card-rail flex flex-wrap items-center gap-3 rounded-2xl p-4">
					<Button
						size="lg"
						onClick={() => spin.mutate({})}
						disabled={spin.isPending || slots.filter((s) => s.enabled).length === 0}
					>
						{spin.isPending ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />}
						Spin (random)
					</Button>
					<span className="text-xs text-muted-foreground">
						Weighted by each enabled slot&rsquo;s weight.
					</span>
				</div>

				<form
					className="flex items-center gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						const label = newLabel.trim();
						if (label) add.mutate({ label });
					}}
				>
					<Input
						value={newLabel}
						onChange={(e) => setNewLabel(e.target.value)}
						placeholder="Add a dare…"
						maxLength={80}
					/>
					<Button type="submit" variant="outline" size="lg" disabled={!newLabel.trim() || add.isPending}>
						<Plus className="size-4" />
						Add
					</Button>
				</form>

				{/* slot list */}
				<div className="space-y-2">
					{slotsQ.isLoading ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : slots.length === 0 ? (
						<p className="text-sm text-muted-foreground">No slots yet — add your first dare above.</p>
					) : (
						slots.map((slot) => (
							<SlotEditor
								key={slot.id}
								slot={slot}
								dragging={dragId === slot.id}
								onDragStart={() => setDragId(slot.id)}
								onDropRow={() => onDrop(slot.id)}
								onSpin={() => spin.mutate({ slotId: slot.id })}
								spinDisabled={spin.isPending || !slot.enabled}
							/>
						))
					)}
				</div>
			</section>

			{/* history */}
			<aside className="space-y-3">
				<h2 className="font-heading text-sm font-bold tracking-tight">Recent spins</h2>
				<div className="panel-card rounded-2xl p-3">
					{historyQ.data && historyQ.data.length > 0 ? (
						<ul className="space-y-1.5">
							{historyQ.data.map((s) => (
								<li key={s.id} className="flex items-center justify-between gap-2 text-xs">
									<span className="truncate font-medium">{s.label}</span>
									<time className="shrink-0 text-muted-foreground">{relTime(s.at)}</time>
								</li>
							))}
						</ul>
					) : (
						<p className="text-xs text-muted-foreground">No spins yet.</p>
					)}
				</div>
			</aside>
		</div>
	);
}

function SlotEditor({
	slot,
	dragging,
	onDragStart,
	onDropRow,
	onSpin,
	spinDisabled,
}: {
	slot: SlotRow;
	dragging: boolean;
	onDragStart: () => void;
	onDropRow: () => void;
	onSpin: () => void;
	spinDisabled: boolean;
}) {
	const [label, setLabel] = useState(slot.label);
	const [weight, setWeight] = useState(slot.weight);
	const [color, setColor] = useState(slot.color ?? "#00aced");
	const [enabled, setEnabled] = useState(slot.enabled);

	const upsert = useMutation(
		controlTrpc.slots.upsert.mutationOptions({
			onSuccess: () => invalidateSlots(),
			onError: (e) => toast.error(e.message),
		}),
	);
	const remove = useMutation(
		controlTrpc.slots.remove.mutationOptions({
			onSuccess: () => invalidateSlots(),
			onError: (e) => toast.error(e.message),
		}),
	);

	const save = (patch: Partial<{ label: string; weight: number; color: string | null; enabled: boolean }>) =>
		upsert.mutate({ id: slot.id, label, weight, color, enabled, ...patch });

	return (
		<div
			draggable
			onDragStart={onDragStart}
			onDragOver={(e) => e.preventDefault()}
			onDrop={onDropRow}
			className={`panel-card flex items-center gap-2 rounded-xl p-2.5 ${dragging ? "opacity-50" : ""}`}
		>
			<GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
			<input
				type="color"
				value={color}
				onChange={(e) => {
					setColor(e.target.value);
					save({ color: e.target.value });
				}}
				aria-label="Slot colour"
				className="size-7 shrink-0 cursor-pointer rounded-md border border-[var(--glass-stroke)] bg-transparent"
			/>
			<Input
				value={label}
				onChange={(e) => setLabel(e.target.value)}
				onBlur={() => label.trim() && label !== slot.label && save({ label: label.trim() })}
				maxLength={80}
				className="flex-1"
			/>
			<div className="flex shrink-0 items-center gap-1">
				<span className="text-[10px] text-muted-foreground">×</span>
				<Input
					type="number"
					min={1}
					max={1000}
					value={weight}
					onChange={(e) => setWeight(Number(e.target.value))}
					onBlur={() => {
						const w = Math.max(1, Math.min(1000, Math.floor(weight) || 1));
						setWeight(w);
						if (w !== slot.weight) save({ weight: w });
					}}
					className="w-16"
					aria-label="Weight"
				/>
			</div>
			<label className="flex shrink-0 items-center gap-1.5 text-xs">
				<Checkbox
					checked={enabled}
					onCheckedChange={(v: boolean) => {
						setEnabled(v);
						save({ enabled: v });
					}}
				/>
				On
			</label>
			<Button variant="ghost" size="icon-sm" onClick={onSpin} disabled={spinDisabled} title="Spin to this">
				<Play className="size-3.5" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => remove.mutate({ id: slot.id })}
				disabled={remove.isPending}
				title="Delete"
			>
				<Trash2 className="size-3.5 text-destructive" />
			</Button>
		</div>
	);
}

function relTime(atSeconds: number): string {
	const diff = Date.now() / 1000 - atSeconds;
	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	return `${Math.floor(diff / 86400)}d ago`;
}
