interface SpotifyTokenResponse {
	access_token?: string;
	error?: string;
	error_description?: string;
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

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const envValue = (value: string | undefined) => value?.trim().replace(/^(["'])(.*)\1$/, "$2");

const fetchWithRetry = async (input: string, init: RequestInit, attempts = 3) => {
	let lastError: unknown;

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const response = await fetch(input, { ...init, signal: AbortSignal.timeout(10_000) });
			if (response.status < 500 || attempt === attempts) return response;
		} catch (error) {
			lastError = error;
			if (attempt === attempts) throw error;
		}

		await sleep(250 * 2 ** (attempt - 1));
	}

	throw lastError;
};

export default defineCachedEventHandler(
	async () => {
		const clientId = envValue(process.env.SPOTIFY_CLIENT_ID);
		const clientSecret = envValue(process.env.SPOTIFY_CLIENT_SECRET);
		const refreshToken = envValue(process.env.SPOTIFY_REFRESH_TOKEN);

		if (!clientId || !clientSecret || !refreshToken) return { isPlaying: false, isConfigured: false };

		try {
			const tokenResponse = await fetchWithRetry("https://accounts.spotify.com/api/token", {
				method: "POST",
				headers: {
					Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`,
					"Content-Type": "application/x-www-form-urlencoded",
					Connection: "close",
				},
				body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
			});
			const token = (await tokenResponse.json()) as SpotifyTokenResponse;

			if (!tokenResponse.ok) {
				console.error("Spotify token exchange failed", {
					status: tokenResponse.status,
					error: token.error,
					description: token.error_description,
					clientIdLength: clientId.length,
					clientSecretLength: clientSecret.length,
				});
				return { isPlaying: false, isConfigured: true };
			}

			if (!token.access_token) return { isPlaying: false, isConfigured: true };

			const response = await fetchWithRetry("https://api.spotify.com/v1/me/player/currently-playing", {
				headers: { Authorization: `Bearer ${token.access_token}`, Connection: "close" },
			});

			if (response.status === 204) return { isPlaying: false, isConfigured: true };
			if (!response.ok) throw new Error(`Spotify playback responded with ${response.status}`);

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
		} catch (error) {
			console.error("Spotify playback request failed after retries", error instanceof Error ? { name: error.name, message: error.message, cause: error.cause } : error);
			return { isPlaying: false, isConfigured: true };
		}
	},
	{ maxAge: 30, staleMaxAge: 60, swr: true }
);
