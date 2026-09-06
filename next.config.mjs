/** @type {import('next').NextConfig} */
const backendApiUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:4008"

const noIndexFollowHeaders = [{ key: "X-Robots-Tag", value: "noindex, follow" }]

const nextConfig = {
	async headers() {
		return [
			{ source: "/api/:path*", headers: noIndexFollowHeaders },
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
