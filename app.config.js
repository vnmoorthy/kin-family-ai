// Lets the web build be hosted under a sub-path (GitHub Pages): EXPO_BASE_URL=/kin-family-ai
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments || {}), baseUrl: process.env.EXPO_BASE_URL || "" },
});
