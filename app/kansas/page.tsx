import type { Metadata } from "next"
import { apiBaseUrl, stateConfig } from "@/app/config"
import { futureWellsUserAreaRegisterUrl } from "@/config/userArea"

export const metadata: Metadata = {
	title: "Kansas Oil & Gas Well Data",
}

async function getBackendHealth() {
	try {
		const res = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" })
		if (!res.ok) return null
		const body = await res.json()
		return body?.data ?? null
	} catch {
		return null
	}
}

export default async function KansasLandingPage() {
	const health = await getBackendHealth()

	return (
		<main className="container">
			<section className="hero">
				<h1>{stateConfig.siteName}</h1>
				<p>
					Well, operator, and production data for Kansas, sourced from the {stateConfig.officialAgencyName} (KCC) and the{" "}
					{stateConfig.secondaryAgencyName} (KGS).
				</p>
			</section>

			<div className="card">
				<h2>Backend status</h2>
				{health ? (
					<p>
						<span className="status-pill ok">{health.status}</span> — {health.service} v{health.version}
					</p>
				) : (
					<p>
						<span className="status-pill error">unreachable</span> — backend API not responding at build/request time.
					</p>
				)}
			</div>

			<div className="card">
				<h2>Data coverage</h2>
				<p className="coverage-note">
					This site publishes Kansas well, operator, and production guides and coverage notes sourced from the KCC and
					KGS. Production figures, once published, will always be labeled with the exact month KGS&apos;s source data
					covers rather than implied as current through today.
				</p>
			</div>

			<div className="card cta-card">
				<h2>Search wells, save records, and explore maps</h2>
				<p>
					Well-by-well search, the interactive map, and saved research live in the Future Wells workspace — a single
					account that works across every state we cover, not a separate login for Kansas.
				</p>
				<a className="cta-button" href={futureWellsUserAreaRegisterUrl}>
					Create a free Future Wells account
				</a>
			</div>
		</main>
	)
}
