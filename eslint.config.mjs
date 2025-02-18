import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { fixupPluginRules } from '@eslint/compat';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';

export default tseslint
  .config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,

    {
      languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
        globals: { ...globals.browser },
      },
    },
    {
      plugins: {
        react: eslintPluginReact,
        'react-hooks': fixupPluginRules(eslintPluginReactHooks),
      },
    },
    {
      rules: {
        // ...
        ...eslintPluginReactHooks.configs.recommended.rules,
      },
    },
  )
  .map((config) => ({
    ...config,
    files: ['src/**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  }));
