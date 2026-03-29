export type Sender = 'self' | 'other';

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
	existingAuthorInfo?: unknown;
	adminNotes?: string[];
}
