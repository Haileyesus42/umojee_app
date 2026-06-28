const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    application.service = application.service || [];
    const serviceExists = application.service.some(
      s => s.$?.['android:name']?.includes('VolumeSOSService')
    );
    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': 'expo.modules.volumesosservice.VolumeSOSService',
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
        },
      });
    }

    manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
    const permissions = manifest.manifest['uses-permission'].map(p => p.$?.['android:name']);
    if (!permissions.includes('android.permission.FOREGROUND_SERVICE')) {
      manifest.manifest['uses-permission'].push(
        { $: { 'android:name': 'android.permission.FOREGROUND_SERVICE' } },
        { $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_DATA_SYNC' } }
      );
    }

    return config;
  });
};
