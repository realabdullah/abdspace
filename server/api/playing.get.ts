import url from "url";

export default defineEventHandler(async () => {
	const clientId = process.env.CLIENT_ID;
	const clientSecret = process.env.CLIENT_SECRET;
	const tokenUrl = process.env.TOKEN_URL!;
	const refreshToken = process.env.REFRESH_TOKEN!;

	try {
		const getAccessToken = async () => {
			const response = await fetch(tokenUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
				},
				body: new url.URLSearchParams({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
				}).toString(),
			});
			const data = await response.json();
			return data.access_token;
		};

		const apiToken = await getAccessToken();

		const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
			headers: {
				Authorization: `Bearer ${apiToken}`,
			},
		});

		const data = await response.json();

		return {
			isPlaying: true,
			data: {
				title: data.item.name,
				link: data.item.external_urls.spotify,
				cover_art: data.item.album.images[2].url,
				l_cover_art: data.item.album.images[1].url,
				artists: data.item.artists.map((artist: any) => artist.name).join(", "),
			},
		};
	} catch {
		return { isPlaying: false, data: {} };
	}
});
