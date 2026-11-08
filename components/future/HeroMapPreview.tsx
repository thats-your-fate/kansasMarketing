import { WorkspaceMapPreview } from "./WorkspaceMapPreview"
import { futureWellsCtaHref } from "@/config/userArea"

export function HeroMapPreview() {
 return <WorkspaceMapPreview {...{"stateName":"Kansas","slug":"kansas","wellName":"LUEKER #2","api":"15-001-31954","documentCount":6,"productionLabel":"Associated lease production"}} workspaceHref={futureWellsCtaHref("homepage_map_preview")} />
}
