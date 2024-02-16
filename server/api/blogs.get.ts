export default defineEventHandler(async () => {
    const graphqlUrl = process.env.GRAPHQL_URL!;
    const username = process.env.BLOG_USERNAME!;

    const query = `
        query {
            user(username: "${username}") {
                id
                username
                name
                publications(first: 20) {
                    edges {
                        node {
                            title
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

    return data.data.user.publications.edges[0].node.posts.edges;
});