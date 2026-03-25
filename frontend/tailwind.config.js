/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/services/**/*.{js,ts,jsx,tsx}',
    './node_modules/@sk-web-gui/*/dist/**/*.js',
  ],
  darkMode: 'class',
  presets: [require('@sk-web-gui/core').preset()],
};
