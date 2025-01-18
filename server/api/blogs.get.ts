export default defineEventHandler(async () => {
	const graphqlUrl = process.env.GRAPHQL_URL!;
	const host = process.env.BLOG_HOST!;

	const query = `
        query {
            publication(host: "${host}") {
                posts(first: 20) {
                    edges {
                        node {
                            id
                            slug
                            title
                            brief
                            coverImage {
                                attribution
                                photographer
                            }
                        }
                    }
                }
            }
        }
    `;

	const response = await fetch(graphqlUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query }),
	});

	const data = await response.json();

	return data.data.publication.posts.edges?.map((edge: any) => edge.node);
});
