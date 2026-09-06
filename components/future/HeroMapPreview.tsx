// Kansas equivalent of coloradoMarketing's HeroMapPreview: a pure CSS/React
// illustration (no map library, no state-boundary SVG/GeoJSON — Colorado's
// own version is a hand-tuned clip-path polygon too), reusing the same
// --fwt-hero-map-* classes from future.css.
//
// KS-18 explicitly warns against presenting Kansas as a single-basin
// market. KGS's 2025 production tables show two real, separate leading
// regions rather than one: gas production led by Stevens, Grant, and
// Kearny counties (far southwest), oil production led by Ellis, Haskell,
// Finney, Barton, and Rooks counties (a central/north-central band plus
// two southwest counties oil shares with the gas cluster). Both regions
// are plotted below instead of a single emphasized basin.

const previewPoints = [
	{ label: "Stevens County gas activity", status: "gas", x: 9, y: 93 },
	{ label: "Grant County gas activity", status: "gas", x: 9, y: 82 },
	{ label: "Kearny County gas activity", status: "gas", x: 13, y: 70 },
	{ label: "Haskell County oil activity", status: "oil", x: 17, y: 83 },
	{ label: "Finney County oil activity", status: "oil", x: 18, y: 66 },
	{ label: "Ellis County oil activity", status: "oil", x: 36, y: 38 },
	{ label: "Barton County oil activity", status: "oil", x: 44, y: 55 },
	{ label: "Rooks County oil activity", status: "oil", x: 38, y: 20 },
]

const mapLabels = [
	{ label: "Topeka", x: 85, y: 32 },
	{ label: "Wichita", x: 63, y: 77 },
	{ label: "Dodge City", x: 27, y: 75 },
	{ label: "Garden City", x: 15, y: 68 },
	{ label: "Hays", x: 36, y: 37 },
	{ label: "Southwest Kansas gas", x: 10, y: 60, emphasis: true },
	{ label: "Central & north-central oil", x: 48, y: 40, emphasis: true },
]

export function HeroMapPreview() {
	return (
		<div className="fwt-map-preview" aria-label="Future Wells Kansas activity illustration">
			<div className="fwt-hero-map-canvas" aria-hidden="true">
				<div className="fwt-hero-ks-outline" />
				<div className="fwt-hero-region-band is-sw-gas" />
				<div className="fwt-hero-region-band is-central-oil" />
				{mapLabels.map((item) => (
					<span
						key={item.label}
						className={item.emphasis ? "fwt-hero-map-label is-emphasis" : "fwt-hero-map-label"}
						style={{ left: `${item.x}%`, top: `${item.y}%` }}
					>
						{item.label}
					</span>
				))}
			</div>
			<div className="fwt-hero-map-shade" aria-hidden="true" />
			<div className="fwt-map-region-label" aria-hidden="true">
				<strong>Kansas oil and gas activity</strong>
				<span>Illustrative regional activity, not a live map</span>
			</div>
			{previewPoints.map((point) => (
				<span key={`${point.label}-${point.x}-${point.y}`} className={`fwt-hero-map-point is-${point.status}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} title={point.label} />
			))}
			<div className="fwt-map-stat" aria-hidden="true">
				<span>
					<strong>Gas</strong>Southwest Kansas
				</span>
				<span>
					<strong>Oil</strong>Central &amp; north-central Kansas
				</span>
			</div>
		</div>
	)
}
