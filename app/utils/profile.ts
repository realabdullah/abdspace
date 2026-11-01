/** Copy shared by every direction, so the rooms never drift from the editorial site. */
export const profile = {
	name: { first: "Abdullahi", last: "Odesanmi" },
	kicker: "frontend engineer",
	lede: "I make interfaces for the web and care about the small things: how it moves, how it reads, how it feels to use.",
	aside: "Outside the browser, I dabble in whatever I’m curious about at the time.",
	email: "abdulodesanmi@gmail.com",
	links: [
		{ label: "GitHub", href: "https://github.com/realabdullah" },
		{ label: "LinkedIn", href: "https://www.linkedin.com/in/abdullahiodesanmi/" },
		{ label: "X", href: "https://x.com/_realabd" },
	],
	ganbaru: {
		word: "頑張る",
		reading: "ganbaru",
		gloss: "to hold on, and do your best",
		// 頑張る, one piece at a time. Read top to bottom, like the hero.
		parts: [
			{ glyph: "頑", reading: "gan", meaning: "stubborn, firm, unwilling to give way" },
			{ glyph: "張", reading: "ba", meaning: "to stretch, to pull tight, to hold out" },
			{ glyph: "る", reading: "ru", meaning: "the ending that turns it into something you do" },
		],
		sum: "Put together: hold firm and keep going, especially when it’s hard.",
		kept: "A word I came across once and kept. It’s how I try to work.",
	},
} as const;
