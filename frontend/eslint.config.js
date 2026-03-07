import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-dev/**', 'dist-sandbox/**', 'node_modules/**', 'build/**', 'coverage/**', '*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react': react,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
      'no-case-declarations': 'off',
      'prefer-const': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-prototype-builtins': 'off',
      'no-cond-assign': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
);
