import { MultiSwitch } from './multi-switch.js';

const STORAGE_KEY = 'message-simulator:theme';

class ThemeSwitch extends HTMLElement {
	#shadow: ShadowRoot;

	constructor() {
		super();
		this.#shadow = this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		const saved = this.#getSaved();
		const initial = saved === 'light' || saved === 'dark' ? saved : 'auto';

		this.#shadow.innerHTML = `
			<style>
				:host {
					display: flex;
				}
			</style>
			<multi-switch
				name="theme"
				options='${JSON.stringify([
					{ label: 'Light', value: 'light' },
					{ label: 'Dark', value: 'dark' },
					{ label: 'Auto', value: 'auto' },
				])}'
				value="${initial}"
			></multi-switch>
		`;

		this.#shadow
			.querySelector<MultiSwitch>('multi-switch')!
			.addEventListener('change', (e) => {
				this.#applyTheme(e.detail.value);
			});
	}

	#getSaved() {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch (_e) {
			return null;
		}
	}

	#applyTheme(value: string) {
		const root = document.documentElement;
		if (value === 'light' || value === 'dark') {
			try {
				localStorage.setItem(STORAGE_KEY, value);
			} catch (_e) {
				// swallow
			}
			root.setAttribute('data-theme', value);
			root.style.colorScheme = value;
		} else {
			// auto
			try {
				localStorage.removeItem(STORAGE_KEY);
			} catch (_e) {
				// swallow
			}
			const prefersDark =
				window.matchMedia &&
				window.matchMedia('(prefers-color-scheme: dark)').matches;
			const theme = prefersDark ? 'dark' : 'light';
			root.setAttribute('data-theme', theme);
			root.style.colorScheme = theme;
		}
	}
}

customElements.define('theme-switch', ThemeSwitch);
