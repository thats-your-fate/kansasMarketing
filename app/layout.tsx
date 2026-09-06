import "./globals.css"

import type { Metadata } from "next"
import type { ReactNode } from "react"
import { siteConfig, publicBaseUrl, indexingEnabled } from "@/app/config"

export const metadata: Metadata = {
	metadataBase: new URL(publicBaseUrl),
	title: {
		default: siteConfig.brandName,
		template: `%s | ${siteConfig.brandName}`,
	},
	description: `${siteConfig.stateName} oil and gas well, operator, and production data sourced from the ${siteConfig.officialAgencyName} and the ${siteConfig.secondaryAgencyName}.`,
	robots: indexingEnabled ? { index: true, follow: true } : { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
