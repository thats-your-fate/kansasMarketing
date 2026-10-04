import "./globals.css"
import "./future.css"

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
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
			{ url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
	},
	manifest: "/site.webmanifest",
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	)
}
