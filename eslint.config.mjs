// @ts-check
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
	// Your custom configs here
	{
		files: ["**/*.{js,mjs,cjs,ts,vue}"],
		plugins: {
			prettier,
		},
		rules: {
			quotes: ["error", "double"],
			"prettier/prettier": [
				"error",
				{
					useTabs: true,
					tabWidth: 4,
					printWidth: 200,
				},
			],
			indent: ["error", "tab"],
		},
	},
	eslintConfigPrettier
);
