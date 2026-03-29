import { html } from '../../utils/template.js';

export function dotsThreeCircleSvg() {
	return html`
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 256 256"
			fill="currentColor"
			aria-hidden="true"
		>
			<circle
				cx="128"
				cy="128"
				r="96"
				fill="none"
				stroke="currentColor"
				stroke-miterlimit="10"
				stroke-width="16"
			/>
			<circle cx="128" cy="128" r="12" />
			<circle cx="172" cy="128" r="12" />
			<circle cx="84" cy="128" r="12" />
		</svg>
	`;
}
