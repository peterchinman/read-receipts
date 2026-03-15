export const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if (isIOS) document.documentElement.classList.add('ios');

let initialized = false;

export function initIOSViewport() {
	if (initialized || !isIOS || !window.visualViewport) return;
	initialized = true;

	let previousViewportHeight = visualViewport.height;
	let keyboardVisible = false;
	visualViewport.addEventListener('resize', () => {
		const newViewportHeight = window.visualViewport.height;
		if (newViewportHeight < previousViewportHeight) {
			const vh = newViewportHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
			if (!keyboardVisible) {
				keyboardVisible = true;
				window.scrollTo(0, 0);
				document.dispatchEvent(
					new CustomEvent('ios-viewport:keyboard-appearing'),
				);
			}
		} else {
			keyboardVisible = false;
			document.documentElement.style.setProperty('--vh', '1dvh');
			document.dispatchEvent(new CustomEvent('ios-viewport:keyboard-hidden'));
		}
		previousViewportHeight = newViewportHeight;
	});
}
