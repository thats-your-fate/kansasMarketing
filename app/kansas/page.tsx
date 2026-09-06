import { redirect } from "next/navigation"

// KS-18 moved all real content to top-level routes (/, /data, /methodology,
// etc.), matching coloradoMarketing's own precedent — Colorado's marketing
// pages are top-level, and only its full data-app pages sit under
// /colorado/*. This route no longer holds real content; kept as a redirect
// rather than deleted outright in case anything already links here.
export default function LegacyKansasPage() {
	redirect("/")
}
