import Image from "next/image"

type SocialLink =
	| {
			href: string
			label: string
			icon: string
	  }
	| {
			href: string
			label: string
			text: string
	  }

const socialLinks: SocialLink[] = [
	{
		href: "https://x.com/futurewellsllc",
		label: "Future Wells on X",
		icon: "/social-icons/twitter.png",
	},
	{
		href: "https://www.linkedin.com/company/future-wells-holdings-llc/",
		label: "Future Wells Holdings on LinkedIn",
		icon: "/social-icons/linkedin.png",
	},
	{
		href: "https://www.facebook.com/share/1K3bfzSeV5/",
		label: "Future Wells on Facebook",
		icon: "/social-icons/communication.png",
	},
	{
		href: "https://www.threads.com/@futurewellsllc",
		label: "Future Wells on Threads",
		text: "Th",
	},
]

export function SocialLinks() {
	return (
		<div className="fwt-social-links" aria-label="Future Wells social links">
			{socialLinks.map((link) => (
				<a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
					{"icon" in link ? (
						<Image src={link.icon} alt="" aria-hidden="true" width={18} height={18} />
					) : (
						<span aria-hidden="true">{link.text}</span>
					)}
				</a>
			))}
		</div>
	)
}
