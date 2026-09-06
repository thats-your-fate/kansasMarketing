import Link from "next/link"

export type BreadcrumbTrailItem = {
	name: string
	path: string
}

export function BreadcrumbTrail({ items }: { items: BreadcrumbTrailItem[] }) {
	return (
		<nav className="fwt-breadcrumbs" aria-label="Breadcrumb">
			<div className="fwt-container">
				<ol>
					{items.map((item, index) => {
						const current = index === items.length - 1
						return (
							<li key={`${item.path}-${item.name}`} aria-current={current ? "page" : undefined}>
								<Link href={item.path}>{item.name}</Link>
							</li>
						)
					})}
				</ol>
			</div>
		</nav>
	)
}
