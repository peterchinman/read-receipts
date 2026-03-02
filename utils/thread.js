/**
 * Returns the display name for a thread or submission object.
 * Falls back to the first participant's name, then 'Untitled'.
 *
 * Works with both frontend store thread objects and backend API submission objects,
 * both of which use the same { name, participants: [{ full_name }] } shape.
 *
 * @param {Object|null} thread
 * @returns {string}
 */
export function getThreadDisplayName(thread) {
	return thread?.name || thread?.participants?.[0]?.full_name || 'Untitled';
}
