// Headless Chrome for CI and containers (set CHROME_BIN to a Chromium binary when Chrome isn't installed).
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox'] },
    },
    reporters: ['progress'],
    singleRun: true,
  });
};
