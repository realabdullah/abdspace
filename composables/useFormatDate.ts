export const formatDate = (isoString?: string): string => {
	if (!isoString) return isoString || "";

	const defaultOptions: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "long",
		day: "numeric",
		weekday: "long",
	};

	return new Date(isoString).toLocaleDateString(undefined, defaultOptions);
};
