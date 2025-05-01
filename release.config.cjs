require('dotenv').config();
const prod = process.env.NODE_ENV === 'production';
const stashFile = prod ? 'stash.yml' : 'stash-next.yml';
const assets = prod ? ['./CHANGELOG.md', `./${stashFile}`] : [`./${stashFile}`];
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
    ['./release.plugin.js', { stashFile }],

    [
      '@semantic-release/git',
      {
        assets,
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
