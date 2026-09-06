"use client"

import { useEffect, useMemo, useRef } from "react"
import { trackEvent } from "@/app/analytics"

// Ported verbatim from coloradoMarketing/wyomingMarketing's shared conversion
// pattern (task doc §10 / architecture decision: reuse this component rather
// than building a Kansas-specific one) — the real search/save/map product
// this links to lives only in the shared futurewells.co user-area, never in
// this site itself. Do not add a self-hosted search or map to match it.

type RecordKind = "county" | "field" | "operator" | "well"
type CtaPlacement = "content" | "bottom"

type RecordConversionCtaProps = {
	kind?: RecordKind
	label?: string | null
	pageType?: RecordKind
	entityId?: string | number | null
	entityName?: string | null
	returnTo?: string
	placement?: CtaPlacement
}

const REGISTER_BASE = "https://futurewells.co/user-area/register"

const recordKindLabels: Record<RecordKind, string> = {
	county: "county",
	field: "field",
	operator: "operator",
	well: "well",
}

const benefits = ["Save records", "Search related wells", "Explore maps", "Included research credits"]

export function RecordConversionCta({
	kind,
	label,
	pageType,
	entityId,
	entityName,
	returnTo,
	placement = "content",
}: RecordConversionCtaProps) {
	const ctaRef = useRef<HTMLElement | null>(null)
	const resolvedPageType = pageType ?? kind ?? "well"
	const recordLabel = entityName || label || `this ${recordKindLabels[resolvedPageType]}`
	const copy = ctaCopy(resolvedPageType, recordLabel)
	const href = useMemo(
		() => registerHref({ entityId, entityName: recordLabel, pageType: resolvedPageType, placement, returnTo }),
		[entityId, placement, recordLabel, resolvedPageType, returnTo],
	)
	const analyticsParams = useMemo(
		() => ({
			page_type: resolvedPageType,
			cta_location: placement,
			entity_id: entityId == null ? undefined : String(entityId),
			entity_name: recordLabel,
		}),
		[entityId, placement, recordLabel, resolvedPageType],
	)

	useEffect(() => {
		const node = ctaRef.current
		if (!node) return
		let didTrack = false
		const trackView = () => {
			if (didTrack) return
			didTrack = true
			trackEvent("account_cta_view", analyticsParams)
		}

		if (!("IntersectionObserver" in window)) {
			trackView()
			return
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					trackView()
					observer.disconnect()
				}
			},
			{ threshold: 0.35 },
		)
		observer.observe(node)
		return () => observer.disconnect()
	}, [analyticsParams])

	function handleClick(action: "primary" | "secondary") {
		trackEvent("account_cta_click", { ...analyticsParams, cta_action: action })
	}

	return (
		<aside ref={ctaRef} className="fwt-record-inline-cta" aria-label="Future Wells account research tools">
			<div>
				<span className="fwt-eyebrow">Research workspace</span>
				<h2>{copy.headline}</h2>
				<p>{copy.body}</p>
				<ul className="fwt-record-inline-benefits">
					{benefits.map((benefit) => (
						<li key={benefit}>{benefit}</li>
					))}
				</ul>
			</div>
			<div className="fwt-record-inline-actions">
				<a className="fwt-btn gold" href={href} onClick={() => handleClick("primary")}>
					{copy.primary}
				</a>
				<a className="fwt-record-inline-secondary" href={href} onClick={() => handleClick("secondary")}>
					Create free account <span aria-hidden="true">-&gt;</span>
				</a>
			</div>
		</aside>
	)
}

function ctaCopy(pageType: RecordKind, recordLabel: string) {
	if (pageType === "well") {
		return {
			headline: "Continue researching this well",
			body: "Save this well, explore related activity and continue the same research in the Future Wells workspace.",
			primary: "Research this well",
		}
	}
	if (pageType === "operator") {
		return {
			headline: `Research ${recordLabel}`,
			body: "Explore this operator's wells, activity, locations and related public records in the Future Wells research workspace.",
			primary: "Research this operator",
		}
	}
	if (pageType === "county") {
		return {
			headline: `Explore ${recordLabel}`,
			body: "Search wells, operators, drilling activity and public records for this county in the Future Wells research workspace.",
			primary: "Explore this county",
		}
	}
	return {
		headline: `Research ${recordLabel}`,
		body: "Explore this field's wells, operators, activity, production and related public records in the Future Wells research workspace.",
		primary: "Research this field",
	}
}

function registerHref({
	entityId,
	entityName,
	pageType,
	placement,
	returnTo,
}: {
	entityId?: string | number | null
	entityName: string
	pageType: RecordKind
	placement: CtaPlacement
	returnTo?: string
}) {
	const url = new URL(REGISTER_BASE)
	const normalizedReturnTo = absoluteReturnTo(returnTo)
	if (normalizedReturnTo) url.searchParams.set("returnTo", normalizedReturnTo)
	url.searchParams.set("state", "KS")
	url.searchParams.set("source", "organic_conversion_cta")
	url.searchParams.set("source_page_type", pageType)
	if (entityId != null) url.searchParams.set("source_entity_id", String(entityId))
	url.searchParams.set("source_entity_name", entityName)
	url.searchParams.set("cta_location", placement)
	return url.toString()
}

function absoluteReturnTo(returnTo?: string) {
	if (!returnTo) return ""
	if (/^https?:\/\//i.test(returnTo)) return returnTo
	const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || ""
	try {
		if (publicSiteUrl) return new URL(returnTo, publicSiteUrl).toString()
		if (typeof window !== "undefined") return new URL(returnTo, window.location.origin).toString()
	} catch {
		return ""
	}
	return returnTo
}
