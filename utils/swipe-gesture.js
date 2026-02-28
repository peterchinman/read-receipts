export const SWIPE_CSS = `
			/* Swipe gesture styles */
			.thread-row-wrapper {
				position: relative;
				display: grid;
				grid-template-rows: 1fr;
				transition: grid-template-rows 250ms ease;
				overflow: hidden;
			}
			.thread-row-wrapper.collapsing {
				grid-template-rows: 0fr;
			}
			.reveal-actions {
				position: absolute;
				top: 0;
				left: 0;
				height: 100%;
				width: 160px;
				display: flex;
				z-index: 1;
			}
			.action-button {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				gap: 4px;
				border: none;
				cursor: pointer;
				color: white;
				padding: 0;
				transition: filter 0.15s ease;
			}
			.action-button:active {
				filter: brightness(0.85);
			}
			.action-button.copy {
				background: var(--color-bubble-self);
			}
			.action-button.delete {
				background: var(--color-status-red);
			}
			.action-button svg {
				width: 24px;
				height: 24px;
				fill: white;
				pointer-events: none;
			}
			.action-button span {
				pointer-events: none;
			}
			.swipe-content {
				position: relative;
				z-index: 2;
				background: var(--color-page);
				touch-action: pan-y;
				user-select: none;
				min-height: 0;
				overflow: hidden;
			}
			.thread-row-wrapper.activated .swipe-content {
				transform: translateX(160px) !important;
				transition: transform 200ms ease-out !important;
			}
			.thread-row-wrapper.removing-left .swipe-content {
				/*transform: translateX(100vw) !important;*/
				transition: transform 100ms ease-out !important;
			}
			:host(:not([show-actions])) .reveal-actions {
				display: none;
			}
`;

export class SwipeGestureHandler {
	constructor() {
		this.SWIPE_ACTIVATION_DISTANCE = 75;
		this.DIRECTIONALITY_THRESHOLD = 5;
		this.DEACTIVATION_THRESHOLD = 40;
		this.COLLAPSE_SPEED = 250;
		this.ANIMATE_SPEED = 100;
		this.SPRING_BACK_SPEED = 250;
		this.SNAP_SPEED = 200;
		this.REVEAL_WIDTH = 160;

		this.touchState = {
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
			isDragging: false,
			isHorizontal: null,
			element: null,
			wrapper: null,
			threadId: null,
			startingOffset: 0,
		};

		this.rafId = null;
		this.activatedWrapper = null;
		this._container = null;

		this._onTouchStart = this._onTouchStart.bind(this);
		this._onTouchMove = this._onTouchMove.bind(this);
		this._onTouchEnd = this._onTouchEnd.bind(this);
		this._onTouchCancel = this._onTouchCancel.bind(this);
	}

	attach(container) {
		this._container = container;
		container.addEventListener('touchstart', this._onTouchStart, {
			passive: true,
		});
		container.addEventListener('touchmove', this._onTouchMove, {
			passive: false,
		});
		container.addEventListener('touchend', this._onTouchEnd, {
			passive: true,
		});
		container.addEventListener('touchcancel', this._onTouchCancel, {
			passive: true,
		});
	}

	detach() {
		if (!this._container) return;
		this._container.removeEventListener('touchstart', this._onTouchStart);
		this._container.removeEventListener('touchmove', this._onTouchMove);
		this._container.removeEventListener('touchend', this._onTouchEnd);
		this._container.removeEventListener('touchcancel', this._onTouchCancel);
		this._container = null;
	}

	resetActivated() {
		this.activatedWrapper = null;
	}

	activateRow(wrapper) {
		if (this.activatedWrapper && this.activatedWrapper !== wrapper) {
			this.deactivateRow(this.activatedWrapper);
		}
		wrapper.classList.add('activated');
		this.activatedWrapper = wrapper;
	}

	deactivateRow(wrapper) {
		if (!wrapper) return;
		wrapper.classList.remove('activated');
		const content = wrapper.querySelector('.swipe-content');
		if (content) {
			content.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
			content.style.transform = 'translateX(0)';
			setTimeout(() => {
				content.style.transition = '';
				content.style.transform = '';
			}, this.SPRING_BACK_SPEED);
		}
		if (this.activatedWrapper === wrapper) this.activatedWrapper = null;
	}

	_onTouchStart(e) {
		if (e.target.closest('.action-button')) return;

		const swipeContent = e.target.closest('.swipe-content');
		if (!swipeContent) {
			if (this.activatedWrapper) {
				this.deactivateRow(this.activatedWrapper);
			}
			return;
		}

		const wrapper = swipeContent.closest('.thread-row-wrapper');
		if (
			!wrapper ||
			wrapper.classList.contains('removing') ||
			wrapper.classList.contains('collapsing')
		)
			return;

		if (this.activatedWrapper && this.activatedWrapper !== wrapper) {
			this.deactivateRow(this.activatedWrapper);
		}

		const touch = e.touches[0];
		swipeContent.style.transition = '';
		const startingOffset = wrapper.classList.contains('activated')
			? this.REVEAL_WIDTH
			: 0;

		this.touchState = {
			startX: touch.clientX,
			startY: touch.clientY,
			currentX: touch.clientX,
			currentY: touch.clientY,
			isDragging: false,
			isHorizontal: null,
			element: swipeContent,
			wrapper: wrapper,
			threadId: wrapper.dataset.threadId,
			startingOffset,
		};
	}

	_onTouchMove(e) {
		if (!this.touchState.element) return;

		const touch = e.touches[0];
		const dx = touch.clientX - this.touchState.startX;
		const dy = touch.clientY - this.touchState.startY;

		if (
			this.touchState.isHorizontal === null &&
			(Math.abs(dx) > this.DIRECTIONALITY_THRESHOLD ||
				Math.abs(dy) > this.DIRECTIONALITY_THRESHOLD)
		) {
			this.touchState.isHorizontal = Math.abs(dx) > Math.abs(dy);
		}

		if (!this.touchState.isHorizontal) return;

		e.preventDefault();

		// On first drag tick from activated state, strip the CSS class so the
		// !important rule no longer overrides the JS-driven transform.
		if (!this.touchState.isDragging && this.touchState.startingOffset > 0) {
			this.touchState.wrapper.classList.remove('activated');
			if (this.activatedWrapper === this.touchState.wrapper)
				this.activatedWrapper = null;
			this.touchState.element.style.transition = 'none';
			this.touchState.element.style.transform = `translateX(${this.REVEAL_WIDTH}px)`;
		}

		this.touchState.isDragging = true;
		this.touchState.currentX = touch.clientX;

		const currentOffset = this.touchState.startingOffset + dx;

		let constrainedOffset;
		if (this.touchState.startingOffset > 0) {
			// From activated: allow closing (leftward) with resistance, rightward is normal
			constrainedOffset =
				currentOffset < 0 ? currentOffset * 0.1 : currentOffset;
		} else {
			// From base: only allow rightward, resist leftward
			constrainedOffset = dx < 0 ? dx * 0.1 : dx;
		}

		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = requestAnimationFrame(() => {
			this.touchState.element.style.transform = `translateX(${constrainedOffset}px)`;
			this.rafId = null;
		});
	}

	_onTouchEnd(e) {
		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		if (!this.touchState.element || !this.touchState.isDragging) {
			this._resetTouchState();
			return;
		}

		const deltaX = this.touchState.currentX - this.touchState.startX;

		if (this.touchState.startingOffset > 0) {
			// Was activated: deactivate if dragged left past threshold, otherwise snap back
			if (deltaX < -this.DEACTIVATION_THRESHOLD) {
				this.deactivateRow(this.touchState.wrapper);
			} else {
				const content = this.touchState.element;
				this.touchState.wrapper.classList.add('activated');
				this.activatedWrapper = this.touchState.wrapper;
				setTimeout(() => {
					content.style.transform = '';
					content.style.transition = '';
				}, this.SNAP_SPEED);
			}
		} else {
			// Was at base state
			if (deltaX > this.SWIPE_ACTIVATION_DISTANCE) {
				// Partial swipe past threshold — snap open to reveal buttons
				const content = this.touchState.element;
				this.activateRow(this.touchState.wrapper);
				setTimeout(() => {
					content.style.transform = '';
					content.style.transition = '';
				}, this.SNAP_SPEED);
			} else {
				// Not far enough — spring back
				this._springBack();
			}
		}

		this._resetTouchState();
	}

	_onTouchCancel(e) {
		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		if (!this.touchState.element) return;

		if (this.touchState.startingOffset > 0) {
			// Snap back to activated position
			const content = this.touchState.element;
			this.touchState.wrapper.classList.add('activated');
			this.activatedWrapper = this.touchState.wrapper;
			setTimeout(() => {
				content.style.transform = '';
				content.style.transition = '';
			}, this.SNAP_SPEED);
		} else {
			this._springBack();
		}

		this._resetTouchState();
	}

	_springBack() {
		if (!this.touchState.element) return;

		const element = this.touchState.element;
		element.style.transition = `transform ${this.SPRING_BACK_SPEED}ms ease-out`;
		element.style.transform = 'translateX(0)';

		setTimeout(() => {
			element.style.transition = '';
			element.style.transform = '';
		}, this.SPRING_BACK_SPEED);
	}

	_resetTouchState() {
		this.touchState = {
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
			isDragging: false,
			isHorizontal: null,
			element: null,
			wrapper: null,
			threadId: null,
			startingOffset: 0,
		};
	}
}
