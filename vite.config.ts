import { defineConfig } from 'vite';

export default defineConfig({
	root: '.',
	server: {
		port: 3000,
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: 'index.html',
		},
	},
});
