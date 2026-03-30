// Simple path-based router
import type { RouteChangeDetail } from '../types/events.js';
import type { RouteName } from '../types/index.js';
import { TypedEventTarget } from './typed-event-target.js';

type RouterEvents = {
	'route:change': CustomEvent<RouteChangeDetail>;
};

export class Router extends TypedEventTarget<RouterEvents> {
	#routes: Array<{ pattern: string; name: RouteName; regex: RegExp }> = [];
	#currentRoute: RouteName | null = null;
	#currentParams = {};

	constructor() {
		super();
	}

	/**
	 * Register a route
	 * @param {string} pattern - Route pattern (e.g., '/piece/:id')
	 * @param {string} name - Route name
	 */
	addRoute(pattern: string, name: RouteName) {
		const regex = this.#patternToRegex(pattern);
		this.#routes.push({ pattern, name, regex });
	}

	#patternToRegex(pattern: string) {
		// Convert route patterns like /piece/:id to regex
		const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const withParams = escaped.replace(/:(\w+)/g, '(?<$1>[^/]+)');
		return new RegExp(`^${withParams}$`);
	}

	/**
	 * Parse the current URL and return the matching route
	 */
	match(path: string) {
		for (const route of this.#routes) {
			const match = path.match(route.regex);
			if (match) {
				return {
					name: route.name,
					pattern: route.pattern,
					params: match.groups || {},
				};
			}
		}
		return null;
	}

	/**
	 * Get the current path
	 */
	getCurrentPath() {
		return window.location.pathname;
	}

	/**
	 * Get the current route info
	 */
	getCurrentRoute() {
		return this.#currentRoute;
	}

	/**
	 * Get the current route params
	 */
	getParams() {
		return { ...this.#currentParams };
	}

	/**
	 * Navigate to a new path
	 */
	navigate(path: string, replace = false) {
		if (replace) {
			window.history.replaceState({}, '', path);
		} else {
			window.history.pushState({}, '', path);
		}
		this.#handleRouteChange();
	}

	/**
	 * Replace the current path without adding to history
	 */
	replace(path: string) {
		this.navigate(path, true);
	}

	/**
	 * Initialize the router and start listening for navigation
	 */
	init() {
		// Handle initial route
		this.#handleRouteChange();

		// Listen for back/forward navigation
		window.addEventListener('popstate', () => {
			this.#handleRouteChange();
		});

		// Intercept link clicks for SPA navigation
		document.addEventListener('click', (e) => {
			const link = (e.target as HTMLElement).closest('a[href]');
			if (!link) return;

			const href = link.getAttribute('href');
			if (!href) return;

			// Only handle internal links
			if (href.startsWith('/') && !href.startsWith('//')) {
				e.preventDefault();
				this.navigate(href);
			}
		});
	}

	#handleRouteChange() {
		const path = this.getCurrentPath();
		const matched = this.match(path);

		this.#currentRoute = matched?.name || null;
		this.#currentParams = matched?.params || {};

		this.emit('route:change', {
			path,
			route: this.#currentRoute,
			params: this.#currentParams,
		});
	}
}

// Create and configure the router
const router = new Router();

// Define routes
router.addRoute('/', 'home');
router.addRoute('/piece/:id', 'piece');
router.addRoute('/create', 'create');
router.addRoute('/login', 'login');
router.addRoute('/auth/verify/:token', 'verify');
router.addRoute('/admin/login', 'admin-login');
router.addRoute('/admin', 'admin');

export { router };
