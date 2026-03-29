export type Sender = 'self' | 'other';

export type MessagesChangedReason =
	| 'init-defaults'
	| 'load'
	| 'thread-pending'
	| 'thread-submitted'
	| 'thread-created'
	| 'thread-deleted'
	| 'thread-changed'
	| 'thread-updated'
	| 'add'
	| 'update'
	| 'timesince-updated'
	| 'delete'
	| 'recipient'
	| 'clear'
	| 'import';

export type NavigateAction =
	| 'back'
	| 'info'
	| 'create'
	| 'show-threads'
	| 'show-editor'
	| 'show-preview';

export type RouteName =
	| 'home'
	| 'piece'
	| 'create'
	| 'login'
	| 'verify'
	| 'admin-login'
	| 'admin';

export type AppMode = 'list' | 'edit' | 'preview';

export interface MessageImage {
	id: string;
	src: string; // data URL
}

export interface RawMessage {
	id: string;
	sender: Sender;
	message: string;
	timeSincePrevious?: string;
	exactTimestamp?: string;
	images?: MessageImage[];
}

export interface ComputedMessage extends RawMessage {
	timestamp: string;
}

// A message update patch — Partial<RawMessage> plus `initialTime` which is handled
// separately by store.updateInitialMessageTime() rather than store.updateMessage().
export type MessagePatch = Partial<RawMessage> & { initialTime?: string };

export interface Participant {
	id: string;
	full_name: string;
	location: string;
	avatar_url: string | null;
}

export interface Thread {
	id: string;
	name?: string;
	messages: RawMessage[];
	participants: Participant[];
	initialMessageTime: string;
	createdAt: string;
	updatedAt: string;
	submittedAt?: string;
	pendingAt?: string;
	backendId?: string;
	editToken?: string;
	authorInfoToken?: string;
	authorInfoMode?: boolean;
	authorInfoSubmitted?: boolean;
	existingAuthorInfo?: {
		payment_platform?: string;
		payment_username?: string;
		name?: string;
		link?: string;
		bio?: string;
	};
	adminNotes?: string[];
}
