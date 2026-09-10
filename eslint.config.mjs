import nextPlugin from "@next/eslint-plugin-next"
import tseslint from "typescript-eslint"

export default [
	{
		ignores: [
			".next/**",
			"next-env.d.ts",
			"node_modules/**",
			"out/**",
		],
	},
	...tseslint.configs.recommended,
	{
		plugins: {
			"@next/next": nextPlugin,
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs["core-web-vitals"].rules,
		},
		settings: {
			next: {
				rootDir: ".",
			},
		},
	},
]
