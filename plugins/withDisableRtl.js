const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Forces the Android app to ignore RTL locales by setting
 * android:supportsRtl="false" on the <application> element.
 * Survives `expo prebuild`, which otherwise regenerates the manifest
 * with supportsRtl="true".
 */
module.exports = function withDisableRtl(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:supportsRtl'] = 'false';
    }
    return config;
  });
};
