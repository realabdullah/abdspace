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

    const response = await fetch(graphqlUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });

    const { data } = await response.json();

    return {
        title: data.post.title,
        dateAdded: data.post.dateAdded,
        dateUpdated: data.post.dateUpdated,
        content: data.post.content,
        coverImage: data.post.coverImage,
        author: {
            name: data.post.author.name,
            photo: data.post.author.photo,
        },
        readTime: data.post.readTime,
    };
});