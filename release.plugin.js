const path = require('path');
const { writeFile, createReadStream, renameSync } = require('fs-extra');
const { createHash } = require('crypto');

const YAML = require('yaml');
function getCurrentDate() {
  const date = new Date();
  const pad = (num) => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate SHA-256 hash of a file
 */
async function getFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

module.exports = {
  /**
   *
   * @param pluginConfig
   * @param {import('semantic-release').PrepareContext } context
   * @returns {Promise<void>}
   */
  prepare: async (pluginConfig, context) => {
    const { cwd, nextRelease, options, logger } = context;

    const zipFile = path.resolve(cwd, 'StashInteractiveTools.zip');

    const versionedZipFile = `StashInteractiveTools-${nextRelease.version}.zip`;
    const downloadUrl = `${options.repositoryUrl}/releases/download/${nextRelease.gitTag}/${versionedZipFile}`;
    logger.info(`Renaming ${zipFile} to ${versionedZipFile}`);
    if (!options.dryRun) {
      renameSync(zipFile, path.resolve(cwd, versionedZipFile));
    }
    const stashContents = {
      id: 'StashInteractiveTools',
      name: 'Stash Interactive Tools',
      metadata: {
        description: 'Enhance your Stash Interactive experience',
      },
      version: nextRelease.version,
      date: getCurrentDate(),
      path: downloadUrl,
      sha256: getFileSha256(path.resolve(cwd)),
    };

    logger.info(
      `Updated stash.yml \nversion:${stashContents.version}\npath:${downloadUrl}\n${stashContents.sha256}`,
    );
    if (!options.dryRun) {
      await writeFile(
        path.resolve(cwd, 'stash.yml'),
        YAML.stringify(stashContents),
      );
    }
  },
};
