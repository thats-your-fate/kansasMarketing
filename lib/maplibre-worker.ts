import * as maplibregl from "maplibre-gl"

const mapLibreWorkerUrl = "/vendor/maplibre/maplibre-gl-worker.mjs"

let configured = false

export function configureMapLibreWorker() {
	if (configured) return
	maplibregl.setWorkerUrl(mapLibreWorkerUrl)
	configured = true
}
