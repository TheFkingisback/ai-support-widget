import manifest from '../../public/widget.manifest.json';
import downloads from '../../public/downloads/release-manifest.json';

export const sdkRelease = {
  ...manifest,
  sdk: `/${manifest.file}`,
  manifest: '/widget.manifest.json',
  starter: `/downloads/${downloads.archives.starter.file}`,
  kit: `/downloads/${downloads.archives.kit.file}`,
  kitSha256: downloads.archives.kit.sha256,
  controller: `/integration-v4/widget-controller.v${manifest.version}.mjs`,
};
