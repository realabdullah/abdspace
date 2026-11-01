/**
 * Where the sun is in the sky, from a date and a place. A compact form of the standard low-precision
 * solar formulae (good to a fraction of a degree, which is far more than shadows on a screen need).
 */

const RAD = Math.PI / 180;

export const LAGOS = { latitude: 6.5244, longitude: 3.3792 };

export interface SunPosition {
	/** Radians above the horizon; negative at night. */
	elevation: number;
	/** Radians clockwise from north. */
	azimuth: number;
}

export const sunPosition = (date: Date, { latitude, longitude } = LAGOS): SunPosition => {
	const days = date.getTime() / 86_400_000 - 10_957.5; // since J2000
	const meanAnomaly = (357.529 + 0.98560028 * days) * RAD;
	const meanLongitude = 280.459 + 0.98564736 * days;
	const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;
	const obliquity = (23.439 - 0.00000036 * days) * RAD;

	const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
	const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
	const siderealHours = (18.697374558 + 24.06570982441908 * days) % 24;
	const hourAngle = (siderealHours * 15 + longitude) * RAD - rightAscension;

	const lat = latitude * RAD;
	const elevation = Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle));
	const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle));
	return { elevation, azimuth: (azimuth + Math.PI * 2) % (Math.PI * 2) };
};

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
export const compassName = (azimuth: number) => COMPASS[Math.round(azimuth / (Math.PI / 4)) % 8]!;
