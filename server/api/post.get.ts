export default defineEventHandler(async (event) => {
	const apiQuery = getQuery(event);

	const graphqlUrl = process.env.GRAPHQL_URL!;

	const query = `
        query {
            post(slug: "${apiQuery.slug}", hostname: "") {
                _id
                title
                dateAdded
                dateUpdated
                content
                coverImage
                author {
                    _id
                    username
                    name
                    photo
                }
                readTime
            }
        }
    `;

	const ogImageApiUrl = process.env.OG_IMAGE_API_URL!;

	const generateOgImage = async (text: string) => {
		const imageTransformations = ["w_1600", "h_836", "q_100"].join(",");
		const textTransformations = ["w_1400", "h_240", "x_60", "y_150", "g_south_west", `l_text:Karla_48:${encodeURIComponent(text)}`, "co_rgb:181717", "c_fit", "fl_layer_apply"].join(",");
		return `${ogImageApiUrl}/${imageTransformations}/${textTransformations}/ogimage.webp`;
	};

	const response = await fetch(graphqlUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query }),
	});

	const { data } = await response.json();

	const ogImage = await generateOgImage(data.post.title);

	return {
		title: data.post.title,
		dateAdded: data.post.dateAdded,
		dateUpdated: data.post.dateUpdated,
		content: data.post.content,
		coverImage: data.post.coverImage,
		ogImage,
		author: {
			name: data.post.author.name,
			photo: data.post.author.photo,
		},
		readTime: data.post.readTime,
	};
});
