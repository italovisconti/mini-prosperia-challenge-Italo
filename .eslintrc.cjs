module.exports = {
  env: { es2021: true, node: true },
  parser: "@typescript-eslint/parser",
  plugins: ["import"],
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  rules: {
    "import/no-unresolved": "off"
  }
};
