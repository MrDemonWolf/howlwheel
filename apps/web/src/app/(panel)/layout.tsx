"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WolfMark } from "@/components/wolf-mark";

/**
 * Chrome for the operator-facing routes (landing + control). The `/overlay`
 * route lives outside this group and stays bare/transparent for OBS.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	return (
		<div className="app-bg flex min-h-svh flex-col text-foreground">
			<header className="sticky top-0 z-30 px-4 pt-3">
				<div className="glass-bar mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-4 py-2.5">
					<Link href="/" className="group flex items-center gap-2.5">
						<WolfMark className="size-8 transition-transform group-hover:scale-110" />
						<span className="font-heading text-lg font-extrabold tracking-tight">Howlwheel</span>
					</Link>
					<nav className="flex items-center gap-1 text-sm">
						<NavLink href="/" active={pathname === "/"}>
							Home
						</NavLink>
						<NavLink href="/control" active={pathname === "/control"}>
							Control
						</NavLink>
					</nav>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
			<footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
				Howlwheel — wheel of dares · by MrDemonWolf
			</footer>
		</div>
	);
}

function NavLink({
	href,
	active,
	children,
}: {
	href: "/" | "/control";
	active: boolean;
	children: React.ReactNode;
}) {
	return (
		<Link
			href={href}
			className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
				active ? "bg-[#13244d] text-[#00aced]" : "text-muted-foreground hover:text-foreground"
			}`}
		>
			{children}
		</Link>
	);
}
