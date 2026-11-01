export interface RoomProject {
	title: string;
	about: string;
	link: string;
	date: string;
	featured: boolean;
}
export interface RoomWriting {
	title: string;
	slug: string;
	createdAt: string;
	readTime: number;
	description: string;
}

export interface RoomContent {
	projects: RoomProject[];
	writings: RoomWriting[];
}

/** Every room gets the whole site at once: all projects and all writing, newest first. */
export const useRoomContent = () =>
	useAsyncData(
		"room-content",
		async (): Promise<RoomContent> => {
			const [projects, writings] = await Promise.all([queryCollection("projects").order("date", "DESC").all(), queryCollection("writings").order("createdAt", "DESC").all()]);
			return {
				projects: projects.map<RoomProject>(({ title, about, link, date, featured }) => ({ title, about, link, date, featured: Boolean(featured) })),
				writings: writings.map<RoomWriting>(({ title, slug, createdAt, readTime, description }) => ({ title, slug, createdAt, readTime, description })),
			};
		},
		{ default: () => ({ projects: [], writings: [] }) }
	);
