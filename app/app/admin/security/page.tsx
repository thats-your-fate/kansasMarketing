import type { Metadata } from "next"
import AdminSecurity from "@/components/admin/AdminSecurity"

export const metadata: Metadata = { title: "Kansas Admin Security", robots: { index: false, follow: false } }
export default function SecurityPage() { return <AdminSecurity /> }
