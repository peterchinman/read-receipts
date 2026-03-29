/**
 * Generic typed EventTarget base class.
 *
 * Declare an event map to get fully typed addEventListener / removeEventListener / emit
 * without per-class overload boilerplate:
 *
 *   type MyEvents = {
 *     'foo': CustomEvent<{ bar: string }>;
 *   };
 *   class MyThing extends TypedEventTarget<MyEvents> {
 *     doSomething() {
 *       this.emit('foo', { bar: 'hello' });           // detail is typed
 *       this.emit('foo', { bar: 'hello' }, { bubbles: false }); // optional overrides
 *     }
 *   }
 *
 *   const thing = new MyThing();
 *   thing.addEventListener('foo', (e) => {
 *     console.log(e.detail.bar); // string — no cast needed
 *   });
 *
 * Unknown event names fall through to the standard EventTarget signatures.
 */
type AnyCustomEventMap = Record<string, CustomEvent>;

export class TypedEventTarget<
	TEvents extends AnyCustomEventMap,
> extends EventTarget {
	addEventListener<K extends keyof TEvents & string>(
		type: K,
		listener: (e: TEvents[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): void;
	// The implementation uses `(e: never) => void` because `never` is the bottom type:
	// any typed listener `(e: TEvents[K]) => void` is assignable to `(e: never) => void`
	// by contravariance (never is assignable to everything).
	addEventListener(
		type: string,
		listener: ((e: never) => void) | EventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		super.addEventListener(
			type,
			listener as EventListenerOrEventListenerObject,
			options,
		);
	}

	removeEventListener<K extends keyof TEvents & string>(
		type: K,
		listener: (e: TEvents[K]) => void,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: ((e: never) => void) | EventListenerObject | null,
		options?: boolean | EventListenerOptions,
	): void {
		super.removeEventListener(
			type,
			listener as EventListenerOrEventListenerObject,
			options,
		);
	}

	emit<K extends keyof TEvents & string>(
		type: K,
		detail: TEvents[K] extends CustomEvent<infer D> ? D : never,
		options?: Omit<CustomEventInit, 'detail'>,
	): boolean {
		return super.dispatchEvent(
			new CustomEvent(type, {
				bubbles: true,
				composed: true,
				...options,
				detail,
			}),
		);
	}
}
