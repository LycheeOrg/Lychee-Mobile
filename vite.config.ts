/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";

/**
 * Files `vp check`, `vp fmt` and `vp lint` skip when called without paths, so
 * that the toolchain scope is `src/` and the root TypeScript configs. Oxfmt
 * would otherwise format every Markdown, YAML and JSON file of the repository,
 * and the generated native projects. A new root directory holding frontend
 * files must be removed from this list.
 */
const TOOLCHAIN_SCOPE = [
	// Non-frontend file types, anywhere.
	"**/*.json",
	"**/*.md",
	"**/*.yml",
	"**/*.yaml",
	"**/*.toml",
	"**/*.html",
	// Every root directory other than src.
	"/.github/**",
	"/android/**",
	"/dist/**",
	"/docs/**",
	"/fastlane/**",
	"/ios/**",
	"/public/**",
	"/scripts/**",
];

/**
 * Oxlint, Oxfmt and lint-staged configuration, the same as LycheeOrg/Lychee
 * (its Feature 096): vue essential + typescript recommended rules. Oxlint
 * lints the <script> blocks of .vue files, vue-tsc covers templates.
 */
const toolchain = {
	lint: {
		plugins: ["oxc", "typescript", "unicorn", "vue"],
		categories: {
			correctness: "warn",
		},
		env: {
			builtin: true,
		},
		ignorePatterns: TOOLCHAIN_SCOPE,
		rules: {
			"vue/no-arrow-functions-in-watch": "error",
			"vue/no-async-in-computed-properties": "error",
			"vue/no-computed-properties-in-data": "error",
			"vue/no-deprecated-data-object-declaration": "error",
			"vue/no-deprecated-delete-set": "error",
			"vue/no-deprecated-destroyed-lifecycle": "error",
			"vue/no-deprecated-events-api": "error",
			"vue/no-deprecated-model-definition": "error",
			"vue/no-deprecated-props-default-this": "error",
			"vue/no-deprecated-vue-config-keycodes": "error",
			"vue/no-dupe-keys": "error",
			"vue/no-export-in-script-setup": "error",
			"vue/no-expose-after-await": "error",
			"vue/no-lifecycle-after-await": "error",
			"vue/no-reserved-component-names": "error",
			"vue/no-reserved-keys": "error",
			"vue/no-reserved-props": "error",
			"vue/no-shared-component-data": "error",
			"vue/no-side-effects-in-computed-properties": "error",
			"vue/no-watch-after-await": "error",
			"vue/prefer-import-from-vue": "error",
			"vue/require-prop-type-constructor": "error",
			"vue/require-render-return": "error",
			"vue/require-slots-as-functions": "error",
			"vue/return-in-computed-property": "error",
			"vue/return-in-emits-validator": "error",
			"vue/valid-define-emits": "error",
			"vue/valid-define-options": "error",
			"vue/valid-define-props": "error",
			"vue/valid-next-tick": "error",
			"no-array-constructor": "error",
			"no-unused-expressions": "error",
			"no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
			"typescript/ban-ts-comment": "error",
			"typescript/no-duplicate-enum-values": "error",
			"typescript/no-empty-object-type": "error",
			"typescript/no-explicit-any": "error",
			"typescript/no-extra-non-null-assertion": "error",
			"typescript/no-misused-new": "error",
			"typescript/no-namespace": "error",
			"typescript/no-non-null-asserted-optional-chain": "error",
			"typescript/no-require-imports": "error",
			"typescript/no-this-alias": "error",
			"typescript/no-unnecessary-type-constraint": "error",
			"typescript/no-unsafe-declaration-merging": "error",
			"typescript/no-unsafe-function-type": "error",
			"typescript/no-wrapper-object-types": "error",
			"typescript/prefer-as-const": "error",
			"typescript/prefer-namespace-keyword": "error",
			"typescript/triple-slash-reference": "error",
			"vite-plus/prefer-vite-plus-imports": "error",
		},
		overrides: [
			{
				files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/*.vue"],
				rules: {
					"constructor-super": "off",
					"getter-return": "off",
					"no-class-assign": "off",
					"no-const-assign": "off",
					"no-dupe-class-members": "off",
					"no-dupe-keys": "off",
					"no-func-assign": "off",
					"no-import-assign": "off",
					"no-new-native-nonconstructor": "off",
					"no-obj-calls": "off",
					"no-redeclare": "off",
					"no-setter-return": "off",
					"no-this-before-super": "off",
					"no-undef": "off",
					"no-unreachable": "off",
					"no-unsafe-negation": "off",
					"no-var": "error",
					"no-with": "off",
					"prefer-const": "error",
					"prefer-rest-params": "error",
					"prefer-spread": "error",
				},
			},
		],
		options: {
			typeAware: false,
			typeCheck: false,
		},
		jsPlugins: [
			{
				name: "vite-plus",
				specifier: "vite-plus/oxlint-plugin",
			},
		],
	},
	fmt: {
		printWidth: 150,
		semi: true,
		useTabs: true,
		tabWidth: 4,
		insertFinalNewline: true,
		sortPackageJson: false,
		ignorePatterns: TOOLCHAIN_SCOPE,
	},
	staged: {
		"*.{ts,vue,css}": "vp fmt",
	},
};

export default defineConfig({
	...toolchain,
	/**
	 * Vitest (bundled with Vite+, run with `vp test`): unit tests sit next to
	 * the module they cover as `*.test.ts` under src.
	 */
	test: {
		include: ["src/**/*.test.ts"],
		environment: "jsdom",
	},
	plugins: [vue()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	build: {
		// Capacitor copies `dist/` into the native projects (`cap sync`).
		outDir: "dist",
		// The bundle is loaded from the device, not the network: Ionic alone
		// exceeds Vite's 500 kB web default.
		chunkSizeWarningLimit: 2048,
	},
});
