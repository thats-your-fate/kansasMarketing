/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:4008"

const noIndexFollowHeaders = [{ key: "X-Robots-Tag", value: "noindex, follow" }]

const nextConfig = {
	distDir: process.env.NEXT_DIST_DIR || ".next",
	async headers() {
		return [
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
