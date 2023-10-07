<template>
	<section class="work__experiences d-flex flex-column items-start">
		<h1 class="work__experiences-header col-text weight-500 text-one">Work Experiences.</h1>
		<ul class="work__experiences-content d-flex flex-column items-start">
			<li class="col-text text-four weight-400">
				<span class="weight-500">Frontend Engineer</span>
				at
				<span class="col-text weight-500"><span class="blurry-text" @contextmenu.prevent>unknown 🫣</span></span>
				(Sept, 2023 - Present)
			</li>
			<li class="col-text text-four weight-400">
				<span class="weight-500">Frontend Engineer</span>
				at
				<a href="https://getfidia.com" target="_blank" class="col-text weight-500">Fidia Inc.</a>
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
