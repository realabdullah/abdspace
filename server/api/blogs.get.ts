export default defineEventHandler(async () => {
    const graphqlUrl = process.env.GRAPHQL_URL!;
    const username = process.env.BLOG_USERNAME!;

    const query = `
        query {
            user(username: "${username}") {
            _id
            username
            name
            publication {
                title
                posts(page: 0) {
                slug
                title
                brief
                coverImage
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
    
    return data.data.user.publication.posts;
});