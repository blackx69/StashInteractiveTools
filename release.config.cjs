require('dotenv').config();
/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: ['main', { name: 'next', prerelease: true }],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    ['@semantic-release/release-notes-generator', { host: 'github.com' }],
    '@semantic-release/changelog',
    './release.plugin.js',

    [
      '@semantic-release/git',
      {
        assets: ['./CHANGELOG.md', './stash.yml'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [{ path: './dist/StashInteractiveTools-*.zip' }],
      },
    ],
  ],
};
