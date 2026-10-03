<template>
	<header class="header wrap mono">
		<NuxtLink to="/" class="header__name" aria-label="Abdullahi Odesanmi, home">abd<span class="header__rest" aria-hidden="true">ullahi</span></NuxtLink>
		<nav class="header__nav" aria-label="Main">
			<NuxtLink to="/projects" class="link">projects</NuxtLink>
			<NuxtLink to="/writings" class="link">writing</NuxtLink>
			<NuxtLink to="/#contact" class="link">contact</NuxtLink>
			<ThemeToggle />
		</nav>
	</header>
</template>

<style scoped>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding-block: 1.75rem;
}
.header__name {
	display: inline-flex;
	white-space: nowrap;
	color: var(--fg);
}
/* "abd" unfurls into the first name on hover. */
.header__rest {
	display: inline-block;
	max-width: 0;
	overflow: hidden;
	opacity: 0;
	transition:
		max-width 500ms var(--ease-out),
		opacity 300ms ease;
}
.header__name:hover .header__rest,
.header__name:focus-visible .header__rest {
	max-width: 6ch;
	opacity: 1;
}
.header__nav {
	display: flex;
	align-items: center;
	gap: clamp(0.875rem, 3vw, 1.75rem);
	color: var(--muted);
}
.header__nav a:hover,
.header__nav a.router-link-exact-active:not([href*="#"]) {
	color: var(--fg);
}
</style>
