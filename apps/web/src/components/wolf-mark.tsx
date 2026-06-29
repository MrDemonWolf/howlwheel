/**
 * Howlwheel wolf mark — a geometric wolf head in the brand cyan, set in a
 * navy rounded square. Pure inline SVG so it ships with no extra asset.
 */
export function WolfMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 64 64"
			className={className}
			role="img"
			aria-label="Howlwheel"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect width="64" height="64" rx="16" fill="#091533" />
			<g fill="none" stroke="#00aced" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
				{/* ears + head silhouette */}
				<path d="M18 16 L24 30 M46 16 L40 30" />
				<path d="M18 16 L22 26 L32 22 L42 26 L46 16 L44 34 Q44 48 32 52 Q20 48 20 34 Z" fill="#0c1b40" />
				{/* eyes */}
				<path d="M26 33 L30 35" />
				<path d="M38 33 L34 35" />
				{/* snout */}
				<path d="M32 40 L29 44 M32 40 L35 44 M32 40 L32 46" stroke="#5bc8f0" />
			</g>
		</svg>
	);
}
