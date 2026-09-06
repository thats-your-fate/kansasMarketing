import { siteConfig } from "@/app/config"
import { canonicalUrl, siteName } from "@/app/seo"

// Simplified, self-contained port of coloradoMarketing's app/structured-
// data.tsx (that version delegates to a shared structured-data-builders.mjs
// used across every state's data-app pages — well/operator/county schema
// this editorial-only site has no equivalent of). Kept: the JSON-LD shapes
// this site's own pages actually use.

type JsonLdValue = Record<string, unknown>

export function JsonLdBlock({ data }: { data: JsonLdValue }) {
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, "\\u003c"),
			}}
		/>
	)
}

export function WebSiteJsonLd() {
	return (
		<JsonLdBlock
			data={{
				"@context": "https://schema.org",
				"@type": "WebSite",
				name: siteName,
				url: canonicalUrl("/"),
			}}
		/>
	)
}

export function OrganizationJsonLd() {
	return (
		<JsonLdBlock
			data={{
				"@context": "https://schema.org",
				"@type": "Organization",
				name: siteConfig.companyName,
				url: canonicalUrl("/"),
				email: "info@futurewells.co",
			}}
		/>
	)
}

export type BreadcrumbItem = { name: string; path: string }

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
	return (
		<JsonLdBlock
			data={{
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				itemListElement: items.map((item, index) => ({
					"@type": "ListItem",
					position: index + 1,
					name: item.name,
					item: canonicalUrl(item.path),
				})),
			}}
		/>
	)
}

export function ArticleJsonLd({ title, description, path }: { title: string; description: string; path: string }) {
	return (
		<JsonLdBlock
			data={{
				"@context": "https://schema.org",
				"@type": "Article",
				headline: title,
				description,
				url: canonicalUrl(path),
				publisher: { "@type": "Organization", name: siteConfig.companyName },
			}}
		/>
	)
}

export function FaqPageJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
	if (!faqs.length) return null
	return (
		<JsonLdBlock
			data={{
				"@context": "https://schema.org",
				"@type": "FAQPage",
				mainEntity: faqs.map((faq) => ({
					"@type": "Question",
					name: faq.question,
					acceptedAnswer: { "@type": "Answer", text: faq.answer },
				})),
			}}
		/>
	)
}
