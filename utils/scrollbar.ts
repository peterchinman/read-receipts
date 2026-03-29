export const HIDE_SCROLLBAR_CSS = `
	.hide-scrollbar {
		/* For Internet Explorer and Edge */
		-ms-overflow-style: none;
		/* For Firefox */
		scrollbar-width: none;
	}

	/* For Chrome, Safari, and Opera (WebKit browsers) */
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
`;
