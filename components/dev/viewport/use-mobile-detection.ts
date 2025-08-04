import { useEffect, useState } from "react";

export function useMobileDetection() {
	const [isMobile, setIsMobile] = useState(false);
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			// Check viewport width
			const isSmallScreen = window.innerWidth < 768;

			// Check if touch device
			const hasTouch =
				"ontouchstart" in window ||
				navigator.maxTouchPoints > 0 ||
				window.matchMedia("(pointer: coarse)").matches;

			setIsMobile(isSmallScreen);
			setIsTouchDevice(hasTouch);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return { isMobile, isTouchDevice };
}
