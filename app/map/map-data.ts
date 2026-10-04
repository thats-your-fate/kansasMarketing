export type KansasMapFeatureProperties = {
	id: string
	api14: string | null
	api_raw: string | null
	kgs_kid: string | null
	title: string
	county: string | null
	operator: string | null
	field_name: string | null
	lease_name: string | null
	lifecycle_status: string | null
	status: string
	status_label: string
	href: string
	last_seen_at: string | null
}

export type KansasMapFeature = GeoJSON.Feature<GeoJSON.Point, KansasMapFeatureProperties>
export type KansasMapCollection = GeoJSON.FeatureCollection<GeoJSON.Point, KansasMapFeatureProperties>
