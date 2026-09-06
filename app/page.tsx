import { redirect } from "next/navigation"
import { stateConfig } from "@/app/config"

export default function RootPage() {
	redirect(`/${stateConfig.slug}`)
}
