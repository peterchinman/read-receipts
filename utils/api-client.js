// API Client for backend communication

import { config } from './config.js';

const API_BASE_URL = 'http://localhost:8000/api';
const TOKEN_STORAGE_KEY = `${config.appName.toLowerCase().replace(/\s+/g, '-')}:auth-token`;

class ApiClient {
	#token = null;

	constructor() {
		this.#loadToken();
	}

	#loadToken() {
		try {
			this.#token = localStorage.getItem(TOKEN_STORAGE_KEY);
		} catch (_e) {
			this.#token = null;
		}
	}

	setToken(token) {
		this.#token = token;
		try {
			if (token) {
				localStorage.setItem(TOKEN_STORAGE_KEY, token);
			} else {
				localStorage.removeItem(TOKEN_STORAGE_KEY);
			}
		} catch (_e) {
			// Storage error
		}
	}

	getToken() {
		return this.#token;
	}

	clearToken() {
		this.setToken(null);
	}

	isAuthenticated() {
		return !!this.#token;
	}

	async #request(endpoint, options = {}) {
		const url = `${API_BASE_URL}${endpoint}`;
		const headers = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...options.headers,
		};

		if (this.#token) {
			headers['Authorization'] = `Bearer ${this.#token}`;
		}

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (response.status === 401) {
			this.clearToken();
			window.dispatchEvent(new CustomEvent('auth:unauthorized'));
		}

		const data = await response.json();

		if (!response.ok) {
			const error = new Error(data.error || data.message || 'Request failed');
			error.status = response.status;
			error.data = data;
			throw error;
		}

		return data;
	}

	// Auth endpoints
	async requestMagicLink(email) {
		return this.#request('/auth/magic-link', {
			method: 'POST',
			body: JSON.stringify({ email }),
		});
	}

	async verifyToken(token) {
		const data = await this.#request(`/auth/verify/${token}`);
		if (data.token) {
			this.setToken(data.token);
		}
		return data;
	}

	async devLogin(email) {
		const data = await this.#request('/auth/dev-login', {
			method: 'POST',
			body: JSON.stringify({ email }),
		});
		if (data.token) {
			this.setToken(data.token);
		}
		return data;
	}

	async getMe() {
		return this.#request('/auth/me');
	}

	async logout() {
		try {
			await this.#request('/auth/logout', { method: 'POST' });
		} finally {
			this.clearToken();
		}
	}

	// Public endpoints
	async getPublishedPieces(page = 1) {
		return this.#request(`/published?page=${page}`);
	}

	async getPublishedPiece(id) {
		return this.#request(`/published/${id}`);
	}

	// Submit thread (authenticated)
	async submitThread(data) {
		return this.#request('/submit', {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	// Admin endpoints
	async getSubmissions(page = 1, status = null) {
		let url = `/admin/submissions?page=${page}`;
		if (status) {
			url += `&status=${encodeURIComponent(status)}`;
		}
		return this.#request(url);
	}

	async getSubmission(id) {
		return this.#request(`/admin/submissions/${id}`);
	}

	async acceptSubmission(id, notes = null) {
		return this.#request(`/admin/submissions/${id}/accept`, {
			method: 'POST',
			body: JSON.stringify({ notes }),
		});
	}

	async rejectSubmission(id, notes = null) {
		return this.#request(`/admin/submissions/${id}/reject`, {
			method: 'POST',
			body: JSON.stringify({ notes }),
		});
	}

	async publishSubmission(id) {
		return this.#request(`/admin/submissions/${id}/publish`, {
			method: 'POST',
		});
	}

	async deleteSubmission(id) {
		return this.#request(`/admin/submissions/${id}`, {
			method: 'DELETE',
		});
	}

	async markPaid(id) {
		return this.#request(`/admin/submissions/${id}/mark-paid`, {
			method: 'POST',
		});
	}

	async requestChanges(id, notes) {
		return this.#request(`/admin/submissions/${id}/request-changes`, {
			method: 'POST',
			body: JSON.stringify({ notes }),
		});
	}

	// User submission endpoints
	async getSubmissionByEditToken(id, token) {
		return this.#request(`/submissions/${id}/edit?token=${encodeURIComponent(token)}`);
	}

	async resubmitThread(id, data) {
		return this.#request(`/submit/${id}/resubmit`, {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}
}

const apiClient = new ApiClient();
export { apiClient, ApiClient };
