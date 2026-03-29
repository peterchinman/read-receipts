export const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if (isIOS) document.documentElement.classList.add('ios');

let initialized = false;
let paused = false;

export function pauseIOSViewport() {
	paused = true;
}

export function resumeIOSViewport() {
	paused = false;
}

export function initIOSViewport() {
	if (initialized || !isIOS || !window.visualViewport) return;
	initialized = true;

	let previousViewportHeight = window.visualViewport!.height;
	let keyboardVisible = false;

	window.visualViewport!.addEventListener('resize', () => {
		const newViewportHeight = window.visualViewport!.height;
		if (newViewportHeight < previousViewportHeight) {
			if (!keyboardVisible) {
				keyboardVisible = true;
				if (!paused) {
					const vh = newViewportHeight * 0.01;
					document.documentElement.style.setProperty('--vh', `${vh}px`);
					window.scrollTo(0, 0);
				}
				document.dispatchEvent(
					new CustomEvent('ios-viewport:keyboard-appearing'),
				);
			}
		} else {
			keyboardVisible = false;
			document.dispatchEvent(new CustomEvent('ios-viewport:keyboard-hidden'));
			if (!paused) {
				document.documentElement.style.setProperty('--vh', '1dvh');
			}
		}
		previousViewportHeight = newViewportHeight;
	});
}
