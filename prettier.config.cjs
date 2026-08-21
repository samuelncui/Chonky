module.exports = {
  printWidth: 120,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
  overrides: [
    {
      files: 'packages/chonky-icon-fontawesome/**/*.{ts,tsx}',
      options: {
        tabWidth: 4,
      },
    },
  ],
};
