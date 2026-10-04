import "./globals.css"
import "./future.css"

import type { Metadata } from "next"
import Script from "next/script"
import type { ReactNode } from "react"
import {
	siteConfig,
	publicBaseUrl,
	indexingEnabled,
	analyticsEnabled,
	analyticsMeasurementId,
	clarityEnabled,
	clarityProjectId,
} from "@/app/config"

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
			<body>
				{analyticsEnabled ? (
					<>
						<Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsMeasurementId}`} strategy="afterInteractive" />
						<Script id="google-analytics" strategy="afterInteractive">
							{`
								window.dataLayer = window.dataLayer || [];
								function gtag(){dataLayer.push(arguments);}
								window.gtag = gtag;
								gtag('js', new Date());
								gtag('config', '${analyticsMeasurementId}');
							`}
						</Script>
					</>
				) : null}
				{clarityEnabled ? (
					<Script id="microsoft-clarity" strategy="afterInteractive">
						{`
							(function(c,l,a,r,i,t,y){
								c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
								t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
								y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
							})(window, document, "clarity", "script", "${clarityProjectId}");
						`}
					</Script>
				) : null}
				{children}
			</body>
		</html>
	)
}
