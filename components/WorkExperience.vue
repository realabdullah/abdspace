<template>
	<section class="work__experiences flex flex-col items-start">
		<h1 class="work__experiences-header text-dark font-medium text-7xl leading-[-1.4px] sm:text-8xl sm:leading-[-1.8px]">Work Experiences.</h1>
		<ul class="work__experiences-content flex flex-col items-start">
			<li class="text-dark text-2xl sm:text-text-3xl font-normal">
				<span class="font-medium">Frontend Engineer</span>
				at
				<span class="text-dark font-medium"><span class="blurry-text text-transparent" @contextmenu.prevent>unknown 🫣</span></span>
				(Sept, 2023 - Present)
			</li>
			<li class="text-dark text-2xl sm:text-text-3xl font-normal">
				<span class="font-medium">Frontend Engineer</span>
				at
				<a href="https://getfidia.com" target="_blank" class="text-dark font-medium">Fidia Inc.</a>
				(Jun, 2022 - Sept, 2023)
			</li>
		</ul>
	</section>
</template>

<style lang="scss" scoped>
.work__experiences {
	max-width: 80rem;
	padding: 10rem 0;

	@media screen and (max-width: 600px) {
        padding: 5rem 0;
	}

	&-header {
		margin-bottom: 5rem;
	}

	&-content {
		gap: 3rem;
	}
}
</style>
