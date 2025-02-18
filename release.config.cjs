require('dotenv').config();
/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: ['main', 'develop'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    './release.plugin.js',
    [
      '@semantic-release/github',
      {
        assets: ['dist/StashInteractiveTools.zip'],
      },
    ],
  ],
};
