"use client"

import { useState } from "react"
import styles from "./WorkspaceMapPreview.module.css"

type Props = { stateName: string; slug: string; wellName: string; api: string; documentCount: number; productionLabel: string; workspaceHref: string; hasProduction?: boolean }

export function WorkspaceMapPreview({ stateName, slug, wellName, api, documentCount, productionLabel, workspaceHref, hasProduction = true }: Props) {
 const [view, setView] = useState<"production" | "documents">("production")
 const image = "/assets/workspace/" + slug + "-" + view + "-map.jpg"
 return <figure className={styles.frame} aria-label={stateName + " Future Wells Co map preview"}>
  <div className={styles.header}><span className={styles.brand}>FW</span><span>Future Wells Co <strong>· {stateName}</strong></span><span className={styles.label}>Workspace preview</span></div>
  <div className={styles.tabs} role="group" aria-label="Screenshot view">
   <button type="button" aria-pressed={view === "production"} onClick={() => setView("production")}>{hasProduction ? "Map & production" : "Map & well details"}</button>
   <button type="button" aria-pressed={view === "documents"} onClick={() => setView("documents")}>Activity &amp; documents</button>
  </div>
  <a className={styles.imageLink} href={image} target="_blank" rel="noopener" aria-label={"Open full-size " + stateName + " " + view + " screenshot"}>
   {/* A local screenshot keeps the homepage lightweight and has no map API dependency. */}
   <img src={image} width={1000} height={434} alt={stateName + " workspace map: " + wellName + ", API " + api + ", with " + (view === "production" ? productionLabel : "recent activity and source documents") + "."} fetchPriority={view === "production" ? "high" : "auto"} />
   <span className={styles.enlarge}>View full screenshot ↗</span>
  </a>
  <figcaption className={styles.caption}>
   <strong>{wellName}</strong>
   <span>API {api} · {documentCount} {documentCount === 1 ? "document" : "documents"} · {productionLabel}</span>
   <small>Workspace screenshots captured November 8, 2026.</small>
   <small className={styles.attribution}>Map: <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a></small>
   <a href={workspaceHref}>Explore {stateName} in Future Wells Co <span aria-hidden="true">→</span></a>
  </figcaption>
 </figure>
}
