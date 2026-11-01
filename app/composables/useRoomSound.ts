import { unlockAudio } from "~/lib/audio";

/** Sound is off until someone asks for it, and stays as they left it while they move between rooms. */
export const useRoomSound = () => {
	const enabled = useState("room-sound", () => false);
	const toggle = () => {
		enabled.value = !enabled.value;
		if (enabled.value) unlockAudio();
	};
	return { enabled, toggle };
};
