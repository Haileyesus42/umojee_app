const appJson = require('./app.json');

module.exports = () => {
  const baseConfig = appJson.expo;
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  return {
    ...baseConfig,
    android: {
      ...baseConfig.android,
      config: {
        ...baseConfig.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
    ios: {
      ...baseConfig.ios,
      config: {
        ...baseConfig.ios?.config,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
  };
};
