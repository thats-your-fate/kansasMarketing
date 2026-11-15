import { fileURLToPath } from "node:url";
import securityHeaders from "./security-headers.cjs";
/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:4008"

const noIndexFollowHeaders = [{ key: "X-Robots-Tag", value: "noindex, follow" }]

const nextConfig = {
 // Incremental cache writes go to KS_EXTERNAL_CACHE_DIR when set; local builds keep Next defaults.
 cacheHandler: fileURLToPath(new URL("./cache-handler.cjs", import.meta.url)),
 experimental: {cpus: 1},
	distDir: process.env.NEXT_DIST_DIR || ".next",
	async headers() {
		return [
            { source: "/:path*", headers: securityHeaders },
			{ source: "/api/:path*", headers: noIndexFollowHeaders },
			{ source: "/app/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
		]
	},
	async rewrites() {
		return [
			{
				source: "/api/ks/:path*",
				destination: `${backendApiUrl}/api/ks/:path*`,
			},
		]
	},
}

export default nextConfig
