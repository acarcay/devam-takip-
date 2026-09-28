export default [{
  files: ['App.js', 'index.js', 'src/**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } },
    globals: Object.fromEntries(['console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'window', 'document', 'URL', 'Blob', '__DEV__'].map(key => [key, 'readonly'])),
  },
  rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-duplicate-imports': 'error', 'no-dupe-keys': 'error', 'valid-typeof': 'error', 'no-constant-binary-expression': 'error' },
}];
