import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

export default <Partial<Config>>{
	theme: {
		extend: {
			colors: {
				primary: "rgb(var(--main-color))",
				secondary: "rgb(var(--secondary-color))",
				dark: "rgb(var(--text-color))",
				white: "rgb(var(--white))",
				transparent: "transparent",
				current: "currentColor",
			},
			fontFamily: {
				primary: ["DM Sans", "sans-serif"],
			},
			animation: {
				ellastic: "ellastic 1s ease-out forwards 0.15s",
				bar: "bar 2.2s ease infinite alternate",
			},
			keyframes: {
				ellastic: {
					"0%": {
						opacity: "0",
						transform: "scale(1, 1)",
					},
					"10%": {
						transform: "scale(1.1, 0.9)",
					},
					"30%": {
						transform: "scale(0.9, 1.1)",
					},
					"50%": {
						transform: "scale(1.05, 0.95)",
					},
					"100%": {
						opacity: "1",
						transform: "scale(1, 1)",
					},
				},
				bar: {
					"10%": {
						transform: "scaleY(0.3)",
					},
					"30%": {
						transform: "scaleY(1)",
					},
					"60%": {
						transform: "scaleY(0.5)",
					},
					"80%": {
						transform: "scaleY(0.75)",
					},
					"100%": {
						transform: "scaleY(0.6)",
					}
				}
			},
		},
	},
};
