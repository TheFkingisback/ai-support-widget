import manifest from '../../public/widget.manifest.json';

export const sdkRelease = {
  ...manifest,
  sdk: `/${manifest.file}`,
  manifest: '/widget.manifest.json',
  starter: '/downloads/ai-support-starter.zip',
  kit: `/downloads/ai-support-integration-v3-sdk-${manifest.version}.zip`,
  controller: `/integration-v3/widget-controller.v${manifest.version}.mjs`,
};
