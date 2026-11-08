import type { Metadata } from "next"
import AdminConsole from "@/components/admin/AdminConsole"

export const metadata: Metadata = { title: "Kansas State Exports", robots: { index: false, follow: false } }
export default function ExportsPage() { return <AdminConsole view="exports" /> }
