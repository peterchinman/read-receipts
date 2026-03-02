// Main application integration: routing, mode switching, URL handling, navigation
import { store } from './components/store.js';
import { router } from './utils/router.js';
import { authState } from './components/auth-state.js';
import { apiClient } from './utils/api-client.js';
import { config } from './utils/config.js';
import { initIOSViewport } from './utils/ios-viewport.js';
import {
	getCurrentThreadId,
	setCurrentThreadId,
	onThreadIdChange,
	replaceCurrentThreadId,
} from './utils/url-state.js';

const LAST_THREAD_KEY = 'message-simulator:last-thread';

/**
 * Get the last active thread ID from local storage
 * @returns {string|null}
 */
function getLastActiveThreadId() {
	try {
		return localStorage.getItem(LAST_THREAD_KEY);
	} catch (_e) {
		return null;
	}
}

/**
 * Save the last active thread ID to local storage
 * @param {string} threadId
 */
function setLastActiveThreadId(threadId) {
	try {
		if (threadId) {
			localStorage.setItem(LAST_THREAD_KEY, threadId);
		}
	} catch (_e) {
		// Swallow storage errors
	}
}

// Initialize the app
async function init() {
	// iOS virtual keyboard viewport workaround
	initIOSViewport();

	// Set document title from config
	document.title = config.appName;

	// Initialize auth state
	await authState.init();

	// Initialize router
	router.init();

	// Listen for route changes
	router.addEventListener('route:change', handleRouteChange);

	// Trigger initial route
	handleRouteChange();
}

/**
 * Handle route changes and render the appropriate view
 */
function handleRouteChange() {
	const appContainer = document.getElementById('app');
	if (!appContainer) return;

	const route = router.getCurrentRoute();
	const params = router.getParams();

	// Clear previous content
	appContainer.innerHTML = '';
	appContainer.className = 'app-container';
	appContainer.removeAttribute('data-mode');

	switch (route) {
		case 'home':
			renderLandingPage(appContainer);
			break;

		case 'piece':
			renderPieceView(appContainer, params.id);
			break;

		case 'create':
			renderCreateView(appContainer);
			break;

		case 'verify':
			renderVerifyPage(appContainer, params.token);
			break;

		case 'admin-login':
			renderAdminLogin(appContainer);
			break;

		case 'admin':
			renderAdminDashboard(appContainer);
			break;

		default:
			// Unknown route - show landing page
			renderLandingPage(appContainer);
	}
}

function renderLandingPage(container) {
	container.innerHTML = `
		<section class="pane pane--landing">
			<landing-page></landing-page>
		</section>
	`;
}

function renderPieceView(container, pieceId) {
	container.innerHTML = `
		<section class="pane pane--piece">
			<piece-reader piece-id="${pieceId}"></piece-reader>
		</section>
	`;
}

function renderVerifyPage(container, token) {
	container.innerHTML = `<auth-verify token="${token}"></auth-verify>`;
}

function renderAdminLogin(container) {
	if (authState.isAdmin) {
		router.navigate('/admin');
		return;
	}
	container.innerHTML = '<admin-login></admin-login>';
}

function renderAdminDashboard(container) {
	if (!authState.isAdmin) {
		router.navigate('/');
		return;
	}
	container.classList.add('app-container--admin');
	container.innerHTML = '<admin-dashboard></admin-dashboard>';
	setupModeSwitching(container);
}

function renderCreateView(container) {
	// Add create-specific class for multi-column layout
	container.classList.add('app-container--create');

	// Render the editor view (original app)
	container.innerHTML = `
		<section class="pane pane--threads">
			<create-list></create-list>
		</section>
		<section class="pane pane--editor">
			<create-editor></create-editor>
		</section>
		<section class="pane pane--preview">
			<create-preview></create-preview>
		</section>
	`;

	// Load store
	store.load();

	// Handle ?edit=ID&token=TOKEN for resubmit flow
	const searchParams = new URLSearchParams(window.location.search);
	const editId = searchParams.get('edit');
	const editToken = searchParams.get('token');
	if (editId) {
		handleEditParam(editId, editToken);
	}

	// Set up URL-based thread loading for create view
	setupUrlThreadManagement();

	// Set up mode switching for mobile/tablet/desktop
	setupModeSwitching(container);
}

/**
 * Handle ?edit=ID&token=TOKEN param for resubmit flow
 */
async function handleEditParam(editId, editToken) {
	try {
		if (!editToken) return;
		const data = await apiClient.getSubmissionByEditToken(editId, editToken);
		if (data.status !== 'changes_requested') {
			return;
		}
		const thread = store.importFromBackend(data);
		if (thread) {
			thread.editToken = editToken;
			// importFromBackend only schedules a debounced save; flush synchronously
			// here so editToken is persisted before the URL params are removed.
			store.save();
			replaceCurrentThreadId(thread.id);
			store.loadThread(thread.id);
			setLastActiveThreadId(thread.id);
		}
		// Clean ?edit= and ?token= from URL
		const url = new URL(window.location.href);
		url.searchParams.delete('edit');
		url.searchParams.delete('token');
		window.history.replaceState({}, '', url.pathname + url.search);
	} catch (_e) {
		// Silently fail — user may not be authenticated or thread not found
	}
}

/**
 * Handle URL-based thread navigation (for create view)
 */
function setupUrlThreadManagement() {
	// On initial load, check URL for thread ID
	const urlThreadId = getCurrentThreadId();

	if (urlThreadId) {
		// Priority 1: Load thread from URL (if it exists)
		const threads = store.listThreads();
		if (threads.some((t) => t.id === urlThreadId)) {
			// Valid thread in URL
			store.loadThread(urlThreadId);
			setLastActiveThreadId(urlThreadId);
		} else {
			// Invalid thread in URL - fall back and update URL
			const lastThreadId = getLastActiveThreadId();
			if (lastThreadId && threads.some((t) => t.id === lastThreadId)) {
				// Use last active thread
				replaceCurrentThreadId(lastThreadId);
				store.loadThread(lastThreadId);
			} else {
				// Fall back to first available thread
				const currentThread = store.getCurrentThread();
				if (currentThread) {
					replaceCurrentThreadId(currentThread.id);
					store.loadThread(currentThread.id);
					setLastActiveThreadId(currentThread.id);
				}
			}
		}
	} else {
		// Priority 2: Try last active thread from local storage
		const lastThreadId = getLastActiveThreadId();
		const threads = store.listThreads();

		if (lastThreadId && threads.some((t) => t.id === lastThreadId)) {
			// Last active thread still exists, use it
			replaceCurrentThreadId(lastThreadId);
			store.loadThread(lastThreadId);
		} else {
			// Priority 3: Fall back to current thread (first in list)
			const currentThread = store.getCurrentThread();
			if (currentThread) {
				replaceCurrentThreadId(currentThread.id);
				setLastActiveThreadId(currentThread.id);
			}
		}
	}

	// Listen for thread changes to save last active
	store.addEventListener('messages:changed', (e) => {
		const { reason, threadId } = e.detail || {};
		if (reason === 'thread-changed' && threadId) {
			setLastActiveThreadId(threadId);
		}
	});

	// Listen for URL changes (back/forward navigation)
	onThreadIdChange((threadId) => {
		if (threadId) {
			// Check if thread exists
			const threads = store.listThreads();
			if (threads.some((t) => t.id === threadId)) {
				// Valid thread
				store.loadThread(threadId);
				setLastActiveThreadId(threadId);
			} else {
				// Invalid thread in URL - fall back and update URL
				const lastThreadId = getLastActiveThreadId();
				if (lastThreadId && threads.some((t) => t.id === lastThreadId)) {
					replaceCurrentThreadId(lastThreadId);
					store.loadThread(lastThreadId);
				} else if (threads.length > 0) {
					replaceCurrentThreadId(threads[0].id);
					store.loadThread(threads[0].id);
					setLastActiveThreadId(threads[0].id);
				}
			}
		} else {
			// No thread ID in URL, try last active or default to first thread
			const lastThreadId = getLastActiveThreadId();
			const threads = store.listThreads();

			if (lastThreadId && threads.some((t) => t.id === lastThreadId)) {
				replaceCurrentThreadId(lastThreadId);
				store.loadThread(lastThreadId);
			} else if (threads.length > 0) {
				replaceCurrentThreadId(threads[0].id);
				store.loadThread(threads[0].id);
				setLastActiveThreadId(threads[0].id);
			}
		}
	});
}

/**
 * Set up responsive navigation handling
 * - Mobile (<900px): uses data-mode to show one pane at a time (list, edit, or preview)
 * - Tablet (900-1200px): uses data-mode to control left pane (list or edit), right pane always shows preview
 * - Desktop (>=1200px): shows all panes simultaneously, no data-mode needed
 */
function setupModeSwitching(appContainer) {
	const ACTION_MAP = {
		'show-threads': 'list',
		'show-editor': 'edit',
		'show-preview': 'preview',
	};

	// Handle navigation events from icon-arrow components
	const handleNavigate = (e) => {
		const { action } = e.detail;
		const mode = ACTION_MAP[action];

		if (!mode) return;

		const width = window.innerWidth;

		// Mobile and tablet (<1200px): use data-mode
		if (width < 1200) {
			appContainer.setAttribute('data-mode', mode);
		}
		// Desktop (>=1200px): no mode needed, all panes visible
	};

	document.addEventListener('navigate', handleNavigate);

	// Set initial mode based on viewport
	const updateInitialMode = () => {
		const width = window.innerWidth;
		if (width < 900) {
			// Mobile: default to preview mode
			if (!appContainer.getAttribute('data-mode')) {
				appContainer.setAttribute('data-mode', 'preview');
			}
		} else {
			// Tablet/Desktop: clear mode attribute
			appContainer.removeAttribute('data-mode');
		}
	};

	updateInitialMode();
	window.addEventListener('resize', updateInitialMode);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
