/**
 * post-prebuild.js
 *
 * Run automatically after `npm run prebuild` (expo prebuild --clean).
 * Restores signing config that prebuild wipes from android/.
 *
 * What it does:
 *  1. Appends release signing properties to android/gradle.properties
 *  2. Patches android/app/build.gradle so the debug signingConfig also uses
 *     the release keystore — both builds share one SHA1, one Firebase OAuth client.
 *
 * Passwords are read from .env (never hardcoded here).
 */

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// ── Load .env manually (no dotenv dependency needed) ─────────────────────────
function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};
  return fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
      return acc;
    }, {});
}

const env = loadEnv();
const KEYSTORE_PASSWORD = env.ANDROID_KEYSTORE_PASSWORD || '';
const KEY_ALIAS         = env.ANDROID_KEY_ALIAS         || 'my-key-alias';
const KEY_PASSWORD      = env.ANDROID_KEY_PASSWORD      || '';

if (!KEYSTORE_PASSWORD) {
  console.error('[post-prebuild] ✖ ANDROID_KEYSTORE_PASSWORD not set in .env — signing config will be incomplete');
  process.exit(1);
}

// ── 1. Restore release signing props in gradle.properties ───────────────────
const gradlePropsPath = path.join(root, 'android', 'gradle.properties');

const signingBlock = `
# Release Signing Config (restored by scripts/post-prebuild.js)
MYAPP_RELEASE_STORE_FILE=../../credentials/my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=${KEY_ALIAS}
MYAPP_RELEASE_STORE_PASSWORD=${KEYSTORE_PASSWORD}
MYAPP_RELEASE_KEY_PASSWORD=${KEY_PASSWORD}
`;

if (fs.existsSync(gradlePropsPath)) {
  const content = fs.readFileSync(gradlePropsPath, 'utf8');
  if (!content.includes('MYAPP_RELEASE_STORE_FILE')) {
    fs.appendFileSync(gradlePropsPath, signingBlock);
    console.log('[post-prebuild] ✔ Appended release signing config to android/gradle.properties');
  } else {
    console.log('[post-prebuild] ✔ Release signing config already present in gradle.properties');
  }
} else {
  console.warn('[post-prebuild] ⚠ android/gradle.properties not found — skipping');
}

// ── 2. Patch build.gradle: debug signingConfig → release keystore ────────────
const buildGradlePath = path.join(root, 'android', 'app', 'build.gradle');

const oldDebugBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const newDebugBlock = `        debug {
            // Use release keystore for debug builds so both share the same SHA1.
            // This keeps a single SHA1 registered in Firebase — no separate debug OAuth client needed.
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

if (fs.existsSync(buildGradlePath)) {
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  if (content.includes("storeFile file('debug.keystore')")) {
    content = content.replace(oldDebugBlock, newDebugBlock);
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    console.log('[post-prebuild] ✔ Patched build.gradle debug signingConfig to use release keystore');
  } else {
    console.log('[post-prebuild] ✔ build.gradle already patched');
  }
} else {
  console.warn('[post-prebuild] ⚠ android/app/build.gradle not found — skipping');
}

console.log('[post-prebuild] Done.');
