export const formatProjectDate = (value?: string, month: "short" | "long" = "short") => {
	return value ? new Intl.DateTimeFormat("en", { month, year: "numeric" }).format(new Date(value)) : "";
};
