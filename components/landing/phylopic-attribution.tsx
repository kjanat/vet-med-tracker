/**
 * Attribution component for PhyloPic silhouettes
 * All images are CC0 1.0 (Public Domain) but we still provide attribution
 */

export function PhylopicAttribution() {
	return (
		<div className="mt-8 text-center text-muted-foreground text-xs">
			Animal silhouettes from{" "}
			<a
				href="https://www.phylopic.org"
				target="_blank"
				rel="noopener noreferrer"
				className="underline hover:text-foreground"
			>
				PhyloPic
			</a>{" "}
			(CC0 1.0)
		</div>
	);
}
