export interface IProject {
    title: string;
    description: string;
    tags: string[];
    live_url: string;
    github_url: string;
}

export interface IBlogPost {
    id: string;
    title: string;
    brief: string;
}

export interface IPost {
	title: string;
	publishedAt: string;
	updatedAt: string;
	content: string;
	coverImage: string;
	ogImage: string;
	author: {
		name: string;
		photo: string;
	};
	readTime: string;
}