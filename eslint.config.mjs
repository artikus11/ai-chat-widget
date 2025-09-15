import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "curly": ["error", "all"]
    },
    ignores: [
      "node_modules/",
      "dist/",
      "demo/",
      "**/*.config.js"
    ],
    overrides: [
      {
        files: ['src/test/**/*.test.js'],
        env: {
          "jest": true,
          "browser": true
        },
        plugins: {
          vitest: require('@vitest/eslint-plugin'),
          testing: require('eslint-plugin-testing-library')
        },
        rules: {
          '@vitest/no-focused-tests': 'error',
          '@vitest/no-identical-title': 'error',
          'testing-library/prefer-screen-queries': 'warn'
        }
      }
    ]
  }
]);
