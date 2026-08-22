const path = require('path');
const {generateDocs} = require('./generator');

module.exports = function pluginGodoc(context, options) {
  const {
    projectRoot,
    packages = [],
    outputDir = './docs/sdk-reference',
    binaryName,
    generateCommands = false,
    commandsOutputPath = './docs/commands.mdx',
  } = options;

  const resolvedProjectRoot = path.resolve(context.siteDir, projectRoot);
  const resolvedOutputDir = path.resolve(context.siteDir, outputDir);
  const resolvedCommandsPath = path.resolve(context.siteDir, commandsOutputPath);

  return {
    name: 'docusaurus-plugin-godoc',

    async loadContent() {
      await generateDocs({
        projectRoot: resolvedProjectRoot,
        packages,
        outputDir: resolvedOutputDir,
        binaryName,
        generateCommands,
        commandsOutputPath: resolvedCommandsPath,
      });
    },
  };
};
