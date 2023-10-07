<script lang="ts" setup>
const skills = [
	"HTML",
	"CSS",
	"JavaScript",
	"Vue.Js",
	"Nuxt.Js",
	"Pinia",
	"Vuex",
	"Vue Router",
	"Vite",
	"REST APIs",
	"GraphQL",
	"Firebase",
	"Supabase",
	"TypeScript",
	"Axios",
	"TailwindCSS",
	"Bootstrap",
	"SASS",
	"Git",
	"Github",
	"VS Code",
];
</script>

<template>
	<section class="about__me d-flex flex-column items-start">
		<h1 class="about__me-header col-text weight-500 text-one">About Me.</h1>
		<div class="about__me-content d-flex flex-column items-start">
			<span class="col-text text-three weight-400">
				I am a Frontend Engineer with a strong passion for creating good web experiences. My journey in this field has been one of continuous learning and growth. I have had the opportunity of
				working on couple of projects, each of I learn new things and broaden my knowledge.
			</span>
			<span class="col-text text-three weight-400">
				My primary focus is on building user-friendly web interfaces that are intuitive for all categories of users. I enjoy translating design concepts into responsive and engaging websites.
				I am well equipped to tackle the problems of frontend web development because I am familiar with frontend technologies such as HTML, CSS, JavaScript, Vue.Js, Nuxt.Js and other related
				technologies.
			</span>
			<span class="col-text text-three weight-400">
				I am always eager to expand my knowledge and expertise. I am excited to contribute my skills and enthusiasm to a forward-thinking organization, where I can be a part of innovative
				projects that push the boundaries of web development and enhance the digital landscape!
			</span>
			<span class="col-text text-three weight-400">
				In a rapidly evolving industry, I believe that adaptability, creativity, and a commitment to excellence are key. As a Frontend Engineer, I am ready to embrace new challenges,
				collaborate with talented teams, and help drive technological progress while delivering top-notch web experiences to users around the world.
			</span>

			<!-- skills -->
			<div class="d-flex flex-column items-start">
				<h2 class="col-text weight-500 text-three">Skills, Tools and Technologies.</h2>
				<div class="d-flex flex-wrap items-center mt-5 gap-3">
					<span v-for="(skill, index) in skills" :key="skill" class="col-text text-four weight-400">{{ skill + (index !== skills.length - 1 ? "," : ".") }}</span>
				</div>
			</div>
		</div>
	</section>
</template>

<style lang="scss" scoped>
.about__me {
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

		span {
			@media screen and (max-width: 768px) {
				text-align: justify;
			}
		}
	}
}
</style>
