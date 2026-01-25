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
			credentials: 'include',
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

	// Thread endpoints (authenticated)
	async getThreads() {
		return this.#request('/threads');
	}

	async createThread(data = {}) {
		return this.#request('/threads', {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	async getThread(id) {
		return this.#request(`/threads/${id}`);
	}

	async updateThread(id, data) {
		return this.#request(`/threads/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		});
	}

	async deleteThread(id) {
		return this.#request(`/threads/${id}`, { method: 'DELETE' });
	}

	async submitThread(id) {
		return this.#request(`/threads/${id}/submit`, { method: 'POST' });
	}

	// Message endpoints (authenticated)
	async addMessage(threadId, data) {
		return this.#request(`/threads/${threadId}/messages`, {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	async updateMessage(id, data) {
		return this.#request(`/messages/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		});
	}

	async deleteMessage(id) {
		return this.#request(`/messages/${id}`, { method: 'DELETE' });
	}

	async uploadImage(messageId, file, altText = '') {
		const formData = new FormData();
		formData.append('image', file);
		if (altText) formData.append('alt_text', altText);

		const url = `${API_BASE_URL}/messages/${messageId}/images`;
		const headers = {};
		if (this.#token) {
			headers['Authorization'] = `Bearer ${this.#token}`;
		}

		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: formData,
			credentials: 'include',
		});

		const data = await response.json();
		if (!response.ok) {
			throw new Error(data.error || 'Upload failed');
		}
		return data;
	}

	// Admin endpoints
	async getSubmissions(page = 1) {
		return this.#request(`/admin/submissions?page=${page}`);
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
}

const apiClient = new ApiClient();
export { apiClient, ApiClient };
