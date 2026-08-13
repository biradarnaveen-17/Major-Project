export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: "readonly", document: "readonly", fetch: "readonly", setInterval: "readonly", clearInterval: "readonly" }
    },
    rules: {
      "no-undef": "error"
    }
  }
];
