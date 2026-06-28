const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { resolver, transformer } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

// Add watcher ignore rules to prevent watching parent node_modules
config.watchFolders = [
  // Add the current project root
  __dirname,
];

// Watch for changes in the project's node_modules and parent directories excluding node_modules
config.resolver.blockList = [
  // Prevent watching changes in the parent node_modules
  new RegExp(`${__dirname}/../../../node_modules/.*`),
];

module.exports = config;