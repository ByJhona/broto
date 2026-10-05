import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const password = process.env.ANDROID_UPLOAD_KEYSTORE_PASSWORD;

if (!password) {
  throw new Error('ANDROID_UPLOAD_KEYSTORE_PASSWORD is missing from .env');
}

const gradlew = process.platform === 'win32' ? String.raw`.\gradlew.bat` : './gradlew';

execSync(`${gradlew} bundleRelease`, {
  cwd: path.join(root, 'android'),
  stdio: 'inherit',
  env: {
    ...process.env,
    'ORG_GRADLE_PROJECT_android.injected.signing.store.file': path.join(root, 'upload-keystore.jks'),
    'ORG_GRADLE_PROJECT_android.injected.signing.store.password': password,
    'ORG_GRADLE_PROJECT_android.injected.signing.key.alias': 'upload',
    'ORG_GRADLE_PROJECT_android.injected.signing.key.password': password,
  },
});
