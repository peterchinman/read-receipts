import type {
	RawMessage,
	ComputedMessage,
	MessagePatch,
	MessagesChangedReason,
	NavigateAction,
	RouteName,
} from './index.js';

export type { MessagePatch };

// --- Event detail interfaces ---

export interface MessagesChangedDetail {
	reason: MessagesChangedReason;
	message: RawMessage | ComputedMessage | null;
	messages: ComputedMessage[];
	recipient: { name: string; location: string };
	threadId: string | null;
}

export interface StorageErrorDetail {
	error: Error;
	operation: 'save';
}

export interface RouteChangeDetail {
	path: string;
	route: RouteName | null;
	params: Record<string, string>;
}

export interface NavigateDetail {
	action: NavigateAction;
}

export interface ThreadListSelectDetail {
	id: string;
}

export interface EditorUpdateDetail {
	id: string;
	patch: MessagePatch;
}

export interface EditorIdDetail {
	id: string;
}

export interface EditorFocusMessageDetail {
	id: string;
}

export interface AuthStateChangeDetail {
	user: Record<string, unknown> | null;
	isAuthenticated: boolean;
	isAdmin: boolean;
	loading: boolean;
}

export interface SenderSwitchChangeDetail {
	checked: boolean;
}

export interface MultiSwitchChangeDetail {
	value: string;
}

// --- Global event map augmentation ---
// These make window/document/HTMLElement addEventListener calls automatically typed.

declare global {
	interface WindowEventMap {
		'auth:unauthorized': CustomEvent<never>;
	}
	interface DocumentEventMap {
		'ios-viewport:keyboard-appearing': CustomEvent<never>;
		'ios-viewport:keyboard-hidden': CustomEvent<never>;
		navigate: CustomEvent<NavigateDetail>;
		'editor:focus-message': CustomEvent<EditorFocusMessageDetail>;
	}
	interface HTMLElementEventMap {
		'thread-list:select': CustomEvent<ThreadListSelectDetail>;
		navigate: CustomEvent<NavigateDetail>;
		'editor:focus-message': CustomEvent<EditorFocusMessageDetail>;
		'editor:update': CustomEvent<EditorUpdateDetail>;
		'editor:delete': CustomEvent<EditorIdDetail>;
		'editor:add-below': CustomEvent<EditorIdDetail>;
		'editor:insert-image': CustomEvent<EditorIdDetail>;
	}
}
