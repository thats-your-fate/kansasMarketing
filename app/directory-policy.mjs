export const ENTITY_DIRECTORY_PATHS = {
	counties: "/counties",
	operators: "/operators",
	fields: "/fields",
}

export function entityDirectoryPath(kind, page = 1) {
	const base = ENTITY_DIRECTORY_PATHS[kind]
	if (!base) throw new Error(`Unknown Kansas directory kind: ${kind}`)
	return page > 1 ? `${base}?page=${page}` : base
}

export function parseDirectoryPage(value) {
	const raw = Array.isArray(value) ? value[0] : value
	if (raw === undefined || raw === "") return 1
	const page = Number(raw)
	return Number.isInteger(page) && page >= 1 ? page : null
}

export function paginateDirectoryItems(items, page, pageSize) {
	if (!Number.isInteger(page) || page < 1) return null
	if (!Number.isInteger(pageSize) || pageSize < 1) return null
	const totalItems = items.length
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize)
	if (page > Math.max(totalPages, 1)) return null
	const start = (page - 1) * pageSize
	return {
		page,
		pageSize,
		totalItems,
		totalPages,
		items: items.slice(start, start + pageSize),
	}
}
