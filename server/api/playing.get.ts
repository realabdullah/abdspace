export default defineEventHandler(async () => {
    const accessToken = process.env.ACCESS_TOKEN;
    
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const data = await response.json();
        return {
            isPlaying: true,
            data: {
                title: data.item.name,
                link: data.item.external_urls.spotify,
                cover_art: data.item.album.images[2].url,
            },
        };
    } catch {
        return { isPlaying: false };
    }
});
