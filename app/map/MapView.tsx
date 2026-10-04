"use client"

import * as maplibregl from "maplibre-gl"
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { FormEvent, useEffect, useRef, useState } from "react"
import { configureMapLibreWorker } from "@/lib/maplibre-worker"
import type { KansasMapCollection, KansasMapFeature, KansasMapFeatureProperties } from "./map-data"

const kansasBounds: [[number, number], [number, number]] = [
	[-102.1, 36.9],
	[-94.5, 40.1],
]

const statewideColumns = 8
const statewideRows = 5
const detailedLimit = 75_000
const statewideTileLimit = 75_000
const overviewZoomThreshold = 7.2

const statusFilters = [
	{ key: "producing", label: "Producing", color: "#7c3aed" },
	{ key: "completed", label: "Completed", color: "#166534" },
	{ key: "permitted", label: "Permit or planned", color: "#f59e0b" },
	{ key: "plugged", label: "Plugged", color: "#6b7280" },
	{ key: "shut_in", label: "Inactive or shut-in", color: "#2563eb" },
	{ key: "historical", label: "Historical", color: "#94a3b8" },
]

const statusColorExpression: ExpressionSpecification = [
	"match",
	["get", "status"],
	"producing",
	"#7c3aed",
	"completed",
	"#166534",
	"permitted",
	"#f59e0b",
	"plugged",
	"#6b7280",
	"shut_in",
	"#2563eb",
	"#94a3b8",
]

const fallbackStyle = {
	version: 8,
	sources: {
		"carto-light": {
			type: "raster",
			tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
			tileSize: 256,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		},
	},
	layers: [
		{ id: "fallback-background", type: "background", paint: { "background-color": "#e8f0ef" } },
		{ id: "fallback-basemap", type: "raster", source: "carto-light" },
	],
} as maplibregl.StyleSpecification

const configuredStyleUrl = process.env.NEXT_PUBLIC_USE_REMOTE_MAP_STYLE === "false"
	? undefined
	: "https://tiles.openfreemap.org/styles/liberty"

const initialMapStyle = configuredStyleUrl || fallbackStyle

type MapRequestBounds = {
	west: number
	south: number
	east: number
	north: number
	limit: number
}

function emptyCollection(): KansasMapCollection {
	return { type: "FeatureCollection", features: [] }
}

function featureKey(feature: KansasMapFeature) {
	return feature.properties.id || feature.properties.api14 || feature.properties.api_raw || feature.properties.kgs_kid || JSON.stringify(feature.geometry.coordinates)
}

function clampBounds(west: number, south: number, east: number, north: number) {
	const clampedWest = Math.max(west, kansasBounds[0][0])
	const clampedSouth = Math.max(south, kansasBounds[0][1])
	const clampedEast = Math.min(east, kansasBounds[1][0])
	const clampedNorth = Math.min(north, kansasBounds[1][1])
	if (clampedWest >= clampedEast || clampedSouth >= clampedNorth) return null
	return { west: clampedWest, south: clampedSouth, east: clampedEast, north: clampedNorth }
}

function mapRequestTiles(map: MapLibreMap, forceGrid = false, forceStatewide = false): MapRequestBounds[] {
	const bounds = map.getBounds()
	const visible = forceStatewide
		? { west: kansasBounds[0][0], south: kansasBounds[0][1], east: kansasBounds[1][0], north: kansasBounds[1][1] }
		: clampBounds(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth())
	if (!visible) return []
	if (!forceStatewide && !forceGrid && map.getZoom() > overviewZoomThreshold) {
		return [{ ...visible, limit: detailedLimit }]
	}

	const lonStep = (visible.east - visible.west) / statewideColumns
	const latStep = (visible.north - visible.south) / statewideRows
	const tiles: MapRequestBounds[] = []
	for (let row = 0; row < statewideRows; row += 1) {
		for (let column = 0; column < statewideColumns; column += 1) {
			tiles.push({
				west: visible.west + lonStep * column,
				south: visible.south + latStep * row,
				east: column === statewideColumns - 1 ? visible.east : visible.west + lonStep * (column + 1),
				north: row === statewideRows - 1 ? visible.north : visible.south + latStep * (row + 1),
				limit: statewideTileLimit,
			})
		}
	}
	return tiles
}

async function fetchMapTile(tile: MapRequestBounds, signal: AbortSignal): Promise<KansasMapCollection> {
	const url = new URL("/api/ks/wells/map", window.location.origin)
	url.searchParams.set("west", tile.west.toFixed(6))
	url.searchParams.set("south", tile.south.toFixed(6))
	url.searchParams.set("east", tile.east.toFixed(6))
	url.searchParams.set("north", tile.north.toFixed(6))
	url.searchParams.set("limit", String(tile.limit))
	const response = await fetch(url, { cache: "no-store", signal })
	if (!response.ok) throw new Error(`Map request failed: ${response.status}`)
	return response.json() as Promise<KansasMapCollection>
}

function filteredCollection(collection: KansasMapCollection, statuses: Set<string>, query: string): KansasMapCollection {
	const normalizedQuery = query.trim().toLowerCase()
	return {
		type: "FeatureCollection",
		features: collection.features.filter((feature) => {
			if (!statuses.has(feature.properties.status)) return false
			if (!normalizedQuery) return true
			return [
				feature.properties.title,
				feature.properties.api14,
				feature.properties.api_raw,
				feature.properties.kgs_kid,
				feature.properties.county,
				feature.properties.operator,
				feature.properties.field_name,
				feature.properties.lease_name,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(normalizedQuery))
		}),
	}
}

function statusCounts(collection: KansasMapCollection) {
	return collection.features.reduce<Record<string, number>>((counts, feature) => {
		const key = feature.properties.status
		counts[key] = (counts[key] || 0) + 1
		return counts
	}, {})
}

export default function MapView() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const mapRef = useRef<MapLibreMap | null>(null)
	const popupRef = useRef<maplibregl.Popup | null>(null)
	const abortRef = useRef<AbortController | null>(null)
	const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const wellsRef = useRef<KansasMapCollection>(emptyCollection())
	const selectedStatusesRef = useRef(new Set(statusFilters.map((status) => status.key)))
	const queryRef = useRef("")
	const [mapReady, setMapReady] = useState(false)
	const [mapError, setMapError] = useState<string | null>(null)
	const [status, setStatus] = useState("Initializing map")
	const [query, setQuery] = useState("")
	const [selectedStatuses, setSelectedStatuses] = useState(() => new Set(statusFilters.map((status) => status.key)))
	const [counts, setCounts] = useState<Record<string, number>>({})

	useEffect(() => {
		selectedStatusesRef.current = selectedStatuses
		applyFilteredWells()
	}, [selectedStatuses])

	useEffect(() => {
		queryRef.current = query
		applyFilteredWells()
	}, [query])

	useEffect(() => {
		if (!containerRef.current || mapRef.current) return
		configureMapLibreWorker()
		let map: MapLibreMap
		try {
			map = new maplibregl.Map({
				container: containerRef.current,
				style: initialMapStyle,
				center: [-98.35, 38.45],
				zoom: 6.05,
				minZoom: 5,
				maxZoom: 14,
				maxBounds: kansasBounds,
				attributionControl: { compact: true },
			})
		} catch (error) {
			setMapError(error instanceof Error ? error.message : "The browser could not initialize the map.")
			setMapReady(true)
			return
		}

		mapRef.current = map
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")
		map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left")
		map.fitBounds(kansasBounds, { padding: 42, duration: 0 })

		let layersReady = false
		function initializeLayers() {
			if (layersReady || !map.isStyleLoaded()) return
			layersReady = true
			map.addSource("kansas-wells", {
				type: "geojson",
				data: emptyCollection(),
				cluster: true,
				clusterRadius: 48,
				clusterMaxZoom: 12,
			})
			map.addLayer({
				id: "kansas-well-clusters",
				type: "circle",
				source: "kansas-wells",
				filter: ["has", "point_count"],
				paint: {
					"circle-color": ["step", ["get", "point_count"], "#5f8f82", 100, "#2f7f72", 1000, "#155e56"],
					"circle-radius": ["step", ["get", "point_count"], 18, 100, 24, 1000, 31],
					"circle-opacity": 0.9,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 1.5,
				},
			})
			map.addLayer({
				id: "kansas-cluster-count",
				type: "symbol",
				source: "kansas-wells",
				filter: ["has", "point_count"],
				layout: {
					"text-field": ["get", "point_count_abbreviated"],
					"text-size": 12,
					"text-font": ["Noto Sans Regular"],
				},
				paint: { "text-color": "#ffffff" },
			})
			map.addLayer({
				id: "kansas-well-points",
				type: "circle",
				source: "kansas-wells",
				filter: ["!", ["has", "point_count"]],
				paint: {
					"circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 4.5, 14, 7],
					"circle-color": statusColorExpression,
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 1,
					"circle-opacity": 0.86,
				},
			})

			map.on("click", "kansas-well-clusters", (event) => {
				const features = map.queryRenderedFeatures(event.point, { layers: ["kansas-well-clusters"] })
				const clusterId = features[0]?.properties?.cluster_id
				const source = map.getSource("kansas-wells") as GeoJSONSource | undefined
				if (clusterId === undefined || !source) return
				void source.getClusterExpansionZoom(clusterId).then((zoom) => {
					map.easeTo({
						center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
						zoom,
					})
				})
			})

			map.on("click", "kansas-well-points", (event: MapLayerMouseEvent) => {
				const feature = event.features?.[0] as KansasMapFeature | undefined
				if (!feature) return
				popupRef.current?.remove()
				popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
					.setLngLat(feature.geometry.coordinates as [number, number])
					.setHTML(popupHtml(feature.properties))
					.addTo(map)
			})

			for (const layer of ["kansas-well-clusters", "kansas-well-points"]) {
				map.on("mouseenter", layer, () => {
					map.getCanvas().style.cursor = "pointer"
				})
				map.on("mouseleave", layer, () => {
					map.getCanvas().style.cursor = ""
				})
			}

			setMapReady(true)
			void fetchWellsInView(true)
		}

		map.on("load", initializeLayers)
		map.on("styledata", initializeLayers)
		map.on("moveend", () => queueFetchWells(180))
		map.on("error", (event) => {
			const message = event.error?.message || ""
			if (message.toLowerCase().includes("api key")) {
				setMapError("The map style service rejected the basemap request. Well points may still be available.")
			}
		})

		const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => map.resize())
		resizeObserver?.observe(containerRef.current)

		return () => {
			abortRef.current?.abort()
			if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
			resizeObserver?.disconnect()
			popupRef.current?.remove()
			map.remove()
			mapRef.current = null
		}
	}, [])

	function applyFilteredWells() {
		const source = mapRef.current?.getSource("kansas-wells") as GeoJSONSource | undefined
		if (!source) return
		const filtered = filteredCollection(wellsRef.current, selectedStatusesRef.current, queryRef.current)
		source.setData(filtered)
		setCounts(statusCounts(wellsRef.current))
		setStatus(`${filtered.features.length.toLocaleString()} of ${wellsRef.current.features.length.toLocaleString()} loaded wells visible after filters`)
	}

	function queueFetchWells(delay: number) {
		if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
		fetchTimerRef.current = setTimeout(() => {
			void fetchWellsInView(false)
		}, delay)
	}

	async function fetchWellsInView(forceStatewide: boolean) {
		const map = mapRef.current
		if (!map?.getSource("kansas-wells")) return
		let tiles = mapRequestTiles(map, false, forceStatewide)
		if (!tiles.length) {
			wellsRef.current = emptyCollection()
			applyFilteredWells()
			return
		}

		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller
		setStatus(tiles.length > 1 ? "Loading statewide well clusters" : "Loading wells in view")
		try {
			let collections = await Promise.all(tiles.map((tile) => fetchMapTile(tile, controller.signal)))
			if (tiles.length === 1 && (collections[0]?.features.length || 0) >= tiles[0].limit) {
				tiles = mapRequestTiles(map, true, forceStatewide)
				setStatus("Loading dense well clusters")
				collections = await Promise.all(tiles.map((tile) => fetchMapTile(tile, controller.signal)))
			}
			if (abortRef.current !== controller) return
			const seen = new Set<string>()
			wellsRef.current = {
				type: "FeatureCollection",
				features: collections
					.flatMap((collection) => collection.features || [])
					.filter((feature) => {
						const key = featureKey(feature)
						if (seen.has(key)) return false
						seen.add(key)
						return true
					}),
			}
			applyFilteredWells()
		} catch (error) {
			if ((error as Error).name === "AbortError") return
			setMapError((error as Error).message)
			setStatus("Map data unavailable")
		}
	}

	function onSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const normalizedQuery = query.trim().toLowerCase()
		if (!normalizedQuery) return
		const first = wellsRef.current.features.find((feature) => {
			return [
				feature.properties.title,
				feature.properties.api14,
				feature.properties.api_raw,
				feature.properties.kgs_kid,
				feature.properties.county,
				feature.properties.operator,
				feature.properties.field_name,
				feature.properties.lease_name,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(normalizedQuery))
		})
		if (!first) return
		mapRef.current?.flyTo({ center: first.geometry.coordinates as [number, number], zoom: 10.2, duration: 650 })
	}

	function toggleStatus(statusKey: string) {
		setSelectedStatuses((current) => {
			const next = new Set(current)
			if (next.has(statusKey)) next.delete(statusKey)
			else next.add(statusKey)
			return next
		})
	}

	return (
		<div className="wells-map-shell">
			<div ref={containerRef} className="wells-map-canvas" />
			{!mapReady || status.startsWith("Loading") ? (
				<div className="wells-map-loading" role="status" aria-live="polite">
					<svg viewBox="0 0 40 40" aria-hidden="true">
						<circle cx="20" cy="20" r="16" />
						<path d="M20 4a16 16 0 0 1 16 16" />
					</svg>
					<span>{status}</span>
				</div>
			) : null}
			<div className="wells-map-panel">
				<details className="map-filter-accordion" open>
					<summary>
						<div>
							<strong>Kansas public well map</strong>
							<span>{status}</span>
						</div>
						<i aria-hidden="true" />
					</summary>
					<div className="map-filter-body">
						<form className="tract-search" onSubmit={onSearch}>
							<div className="tract-search-copy">
								<strong>Search loaded wells</strong>
								<span className="tract-search-status">API, KGS KID, well, lease, operator, county, or field.</span>
							</div>
							<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Stevens, Lansing, or an API number" />
						</form>
						<div className="status-filter-box">
							<div className="status-filter-head">
								<strong>Status filters</strong>
								<span>{selectedStatuses.size} active</span>
							</div>
							<div className="status-filter-actions">
								<button type="button" onClick={() => setSelectedStatuses(new Set(statusFilters.map((filter) => filter.key)))}>All</button>
								<button type="button" onClick={() => setSelectedStatuses(new Set())}>None</button>
							</div>
							<div className="status-filter-grid">
								{statusFilters.map((filter) => (
									<button key={filter.key} type="button" className={selectedStatuses.has(filter.key) ? "status-chip active" : "status-chip"} onClick={() => toggleStatus(filter.key)}>
										<span style={{ background: filter.color }} />
										{filter.label}
										{counts[filter.key] ? <b>{counts[filter.key].toLocaleString()}</b> : null}
									</button>
								))}
							</div>
						</div>
					</div>
				</details>
			</div>
			<div className="area-context-panel">
				<div className="area-context-head">
					<div>
						<strong>Public preview</strong>
						<span>Clustered located wells from Kansas map endpoints.</span>
					</div>
				</div>
				<p>Clusters and map points are source coordinates from KGS-backed well records. More wells load as you pan and zoom.</p>
				<a className="selected-context-link" href="/browse">Browse Kansas records</a>
			</div>
			{mapError ? <p className="wells-map-error" role="alert">{mapError}</p> : null}
		</div>
	)
}

function popupHtml(properties: KansasMapFeatureProperties) {
	const rows = [
		["API", properties.api14 || properties.api_raw],
		["KGS KID", properties.kgs_kid],
		["Status", properties.status_label],
		["Operator", properties.operator],
		["County", properties.county],
		["Field", properties.field_name],
	].filter(([, value]) => value !== null && value !== undefined && value !== "")
	return `
		<div class="wells-map-popup">
			<div class="wells-map-popup-header">
				<strong>${escapeHtml(properties.title)}</strong>
				<a class="wells-map-popup-card-link" href="${escapeHtml(properties.href)}">Open</a>
			</div>
			${rows.map(([key, value]) => `<span><b>${escapeHtml(key)}:</b> ${escapeHtml(value)}</span>`).join("")}
			<small>KGS-backed source location. Verify against official KGS/KCC records.</small>
		</div>
	`
}

function escapeHtml(value: unknown) {
	return String(value ?? "").replace(/[&<>"']/g, (char) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	})[char] || char)
}
