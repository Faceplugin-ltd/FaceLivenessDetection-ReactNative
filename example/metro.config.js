const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const fs = require('fs');
const path = require('path');
const escape = require('escape-string-regexp');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');
const modules = Object.keys({ ...pak.peerDependencies });

function resolveModule(name) {
  const inExample = path.join(__dirname, 'node_modules', name);
  if (fs.existsSync(inExample)) {
    return inExample;
  }
  return path.join(root, 'node_modules', name);
}

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],

  // Prefer the example workspace copy of peer deps; fall back to the repo
  // root when example/node_modules was left empty by an npm-only install.
  resolver: {
    blacklistRE: exclusionList(
      modules
        .filter((m) => fs.existsSync(path.join(__dirname, 'node_modules', m)))
        .map(
          (m) =>
            new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
        )
    ),

    extraNodeModules: modules.reduce((acc, name) => {
      acc[name] = resolveModule(name);
      return acc;
    }, {}),
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
