// Fixed locale and time zone so server and client render the same string.
const monthYear = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const formatMonthYear = (value?: string) => (value ? monthYear.format(new Date(value)) : "");
export const formatFullDate = (value?: string) => (value ? fullDate.format(new Date(value)) : "");

export const formatDuration = (ms: number) => {
	const total = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export const hostOf = (url: string) => {
	const { hostname, pathname } = new URL(url);
	return hostname === "github.com" ? `github${pathname.replace(/^\/realabdullah/, "")}` : hostname.replace(/^www\./, "");
};
