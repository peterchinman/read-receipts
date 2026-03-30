export function html(strings: TemplateStringsArray, ...values: unknown[]) {
	let result = '';
	for (let i = 0; i < strings.length; i++) {
		result += strings[i];
		if (i < values.length) {
			result += values[i];
		}
	}
	return result;
}

export { html as css };
