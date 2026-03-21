(() => {
	const STORAGE_KEY = 'message-simulator:theme';
	const root = document.documentElement;

	const getSavedTheme = () => {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch (_e) {
			return null;
		}
	};

	const applyTheme = (theme) => {
		if (theme === 'dark' || theme === 'light') {
			root.setAttribute('data-theme', theme);
			root.style.colorScheme = theme;
		} else {
			root.removeAttribute('data-theme');
			root.style.colorScheme = '';
		}
	};

	const mql =
		window.matchMedia &&
		window.matchMedia('(prefers-color-scheme: dark)');

	const syncToSystemIfNoOverride = () => {
		const saved = getSavedTheme();
		if (saved === 'dark' || saved === 'light') return;
		applyTheme(mql && mql.matches ? 'dark' : 'light');
	};

	// Initial theme: saved override, else system
	const saved = getSavedTheme();
	if (saved === 'dark' || saved === 'light') applyTheme(saved);
	else syncToSystemIfNoOverride();

	// Live-update when OS theme changes (only when no saved override)
	if (mql) {
		const onChange = () => syncToSystemIfNoOverride();
		if (typeof mql.addEventListener === 'function') {
			mql.addEventListener('change', onChange);
		} else if (typeof mql.addListener === 'function') {
			mql.addListener(onChange);
		}
	}
})();
