const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const withReleaseSigning = (config) => {
  const storePassword = process.env.ANDROID_UPLOAD_KEYSTORE_PASSWORD;
  if (!storePassword) return config;

  config = withGradleProperties(config, (config) => {
    config.modResults.push(
      { type: 'property', key: 'BROTO_UPLOAD_STORE_FILE', value: '../../upload-keystore.jks' },
      { type: 'property', key: 'BROTO_UPLOAD_KEY_ALIAS', value: 'upload' },
      { type: 'property', key: 'BROTO_UPLOAD_STORE_PASSWORD', value: storePassword },
      { type: 'property', key: 'BROTO_UPLOAD_KEY_PASSWORD', value: storePassword },
    );
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    const withSigningConfig = config.modResults.contents.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            if (project.hasProperty('BROTO_UPLOAD_STORE_FILE')) {
                storeFile file(BROTO_UPLOAD_STORE_FILE)
                storePassword BROTO_UPLOAD_STORE_PASSWORD
                keyAlias BROTO_UPLOAD_KEY_ALIAS
                keyPassword BROTO_UPLOAD_KEY_PASSWORD
            }
        }`,
    );
    const withReleaseBuildType = withSigningConfig.replace(
      /(\/\/ Caution! In production[\s\S]*?signingConfig signingConfigs\.)debug/,
      '$1release',
    );
    if (withReleaseBuildType === config.modResults.contents) {
      throw new Error(
        'withReleaseSigning: failed to patch android/app/build.gradle — the expected template markers were not found. Check the Expo-generated build.gradle format and update the plugin regexes.',
      );
    }
    config.modResults.contents = withReleaseBuildType;
    return config;
  });

  return config;
};

module.exports = withReleaseSigning;
