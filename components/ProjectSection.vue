<script lang="ts" setup>
const projects = [
    { title: "MD Editor", description: "I've developed a dynamic web application using Nuxt.js, which offers users a real-time Markdown content preview. With this application, users can effortlessly compose and format Markdown text while receiving instant visual feedback", tools: ["Vue.js", "Nuxt.js", "Typescript", "Pinia", "Remarkable", "IndexedDB"], live: "https://dotmd-editor.vercel.app/", source: "https://github.com/realabdullah/markdown-editor" },
    { title: "Smart Pass", description: "A password manager designed to help users securely store and manage their passwords. It utilizes REST API calls to interact with a server, allowing users to store their sensitive login information in a safe and organized manner.", tools: ["Vue.js", "Nuxt.js", "Typescript", "Pinia", "Axios"], live: "https://smaartpass.vercel.app/", source: "https://github.com/realabdullah/password-manager" },
    { title: "Task Management (WIP 🚧)", description: "Building an intuitive task management system with customizable workspaces and task organization. Upcoming features include seamless team collaboration through workspace invites.", tools: ["Vue.js", "Nuxt.js", "Typescript", "Pinia", "Supabase", "Nodemailer", "V-Calendar"], live: "", source: "https://github.com/realabdullah/task-management" },
    { title: "WebAuthn Experiment", description: "My exploration into the world of WebAuthn – a cutting-edge authentication technology. This project showcases the potential for secure and passwordless login experiences on the web, offering a glimpse into the future of online security.", tools: ["HTML", "CSS", "Node.js", "Parcel", "Express", "LowDB", "Simple WebAuthn"], live: "", source: "https://github.com/realabdullah/webauthn" },
    { title: "Audiophile", description: "Discover and shop for premium audio gadgets, including speakers, headphones, and earphones, in this side project e-commerce web app. Explore a curated selection of high-quality audio equipment for enthusiasts and discover the perfect audio gear for your needs.", tools: ["Vue.js", "Nuxt.js", "Typescript", "Pinia", "IDB"], live: "https://audiophilee.vercel.app/", source: "https://github.com/realabdullah/audiophile" },
]
</script>

<template>
    <section class="projects d-grid items-start content-between">
        <h1 class="projects__header col-text weight-500 text-one position-sticky">Projects.</h1>
        <ul class="projects__content d-flex flex-column items-start">
            <li v-for="(project, index) in projects" :key="index" class="projects__content-item w-full h-auto">
                <div class="details">
                    <h3 class="title text-three col-text">{{ project.title }}</h3>
                    <p class="desc text-four col-text mt-6">{{ project.description }}</p>
                    <span class="tools text-four col-text mt-20 weight-500 d-flex flex-wrap items-center gap-2">Tools/Skills: <span v-for="(tools, idx) in project.tools" :key="idx" class="weight-400">{{ tools + (idx !== project.tools.length - 1 ? "," : ".") }}</span></span>
                    <div class="links d-flex items-center gap-5 mt-15">
                        <a v-if="!!project.live" :href="project.live" target="_blank" class="link text-five col-text">View Live</a>
                        <a :href="project.source" target="_blank" class="link text-five col-text">View Source</a>
                    </div>
                </div>
            </li>
        </ul>
    </section>
</template>

<style lang="scss" scoped>
.projects {
    padding: 10rem 0;
    grid-template-columns: 1fr 1fr;

    @media screen and (max-width: 900px) {
        grid-template-columns: 1fr;
    }

    @media screen and (max-width: 600px) {
        padding: 5rem 0;
    }

    &__header {
        margin-bottom: 5rem;
        top: 5rem;

        @media screen and (max-width: 900px) {
            top: unset;
        }
    }

    &__content {
        gap: 3rem;

        &-item {
            padding: 3rem;
            max-width: 64rem;
            background-color: var(--white);

            @media screen and (max-width: 900px) {
                max-width: 100%;
            }
        }
    }
}
</style>