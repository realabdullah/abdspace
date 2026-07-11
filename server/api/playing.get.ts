interface SpotifyTokenResponse {
	access_token?: string;
}

interface SpotifyCurrentlyPlaying {
	is_playing?: boolean;
	item?: {
		name: string;
		duration_ms: number;
		external_urls: { spotify: string };
		artists: Array<{ name: string }>;
		album: { images: Array<{ url: string }> };
	};
	progress_ms?: number;
}

export default defineCachedEventHandler(
	async () => {
		const clientId = process.env.SPOTIFY_CLIENT_ID;
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
		const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

		if (!clientId || !clientSecret || !refreshToken) return { isPlaying: false, isConfigured: false };

		try {
			const token = await $fetch<SpotifyTokenResponse>("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
			});

			if (!token.access_token) return { isPlaying: false, isConfigured: true };

			const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
				headers: { Authorization: `Bearer ${token.access_token}` },
			});

			if (response.status === 204) return { isPlaying: false, isConfigured: true };
			if (!response.ok) throw new Error(`Spotify responded with ${response.status}`);

			const data = (await response.json()) as SpotifyCurrentlyPlaying;
			if (!data.item) return { isPlaying: false, isConfigured: true };

			return {
				isPlaying: Boolean(data.is_playing),
				isConfigured: true,
				track: {
					title: data.item.name,
					artist: data.item.artists.map((artist) => artist.name).join(", "),
					url: data.item.external_urls.spotify,
					artwork: data.item.album.images.at(-1)?.url || data.item.album.images[0]?.url,
					progress: data.progress_ms || 0,
					duration: data.item.duration_ms,
				},
			};
		} catch (error: any) {
			console.error(
				"couldn't load spotify playback",
				error.data ?? {
					message: error.message,
					status: error.status ?? error.statusCode,
					statusText: error.statusText,
					name: error.name,
					cause: error.cause,
					stack: error.stack,
				},
				error
			);
			return { isPlaying: false, isConfigured: true };
		}
	},
	{ maxAge: 30, staleMaxAge: 60, swr: true }
);
