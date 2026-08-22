const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {parseGoDoc} = require('./parser');
const {renderPackagePage, renderIndexPage, renderCommandsPage} = require('./renderer');

async function generateDocs(options) {
  const {projectRoot, packages, outputDir, binaryName, generateCommands, commandsOutputPath} = options;

  fs.mkdirSync(outputDir, {recursive: true});

  const packageDocs = [];

  for (const pkg of packages) {
    const pkgPath = pkg.path;
    const pkgName = pkg.name || pkgPath.replace(/^\.\//, '');
    const pkgLabel = pkg.label || pkgName;

    try {
      const rawDoc = execSync(`go doc -all ${pkgPath}`, {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 30000,
        env: {
          ...process.env,
          GONOSUMCHECK: 'github.com/vantagecompute/*',
          GONOSUMDB: 'github.com/vantagecompute/*',
          GOPRIVATE: 'github.com/vantagecompute/*',
        },
      });

      const parsed = parseGoDoc(rawDoc, pkgName);
      const markdown = renderPackagePage(parsed, pkgName, pkgLabel);

      const filename = pkgName.replace(/\//g, '-') + '.md';
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, markdown, 'utf8');

      packageDocs.push({
        name: pkgName,
        label: pkgLabel,
        filename,
        overview: parsed.overview,
        types: parsed.types.length,
        functions: parsed.functions.length,
      });
    } catch (err) {
      console.warn(`[godoc] Failed to generate docs for ${pkgName}: ${err.message}`);
    }
  }

  const indexMarkdown = renderIndexPage(packageDocs);
  fs.writeFileSync(path.join(outputDir, 'index.md'), indexMarkdown, 'utf8');

  if (generateCommands && binaryName) {
    try {
      const commandTree = extractCobraCommands(projectRoot, binaryName);
      const commandsMarkdown = renderCommandsPage(commandTree);
      fs.writeFileSync(commandsOutputPath, commandsMarkdown, 'utf8');
    } catch (err) {
      console.warn(`[godoc] Failed to generate commands page: ${err.message}`);
    }
  }

  console.log(`[godoc] Generated docs for ${packageDocs.length} packages`);
}

function extractCobraCommands(projectRoot, binaryName) {
  try {
    const helpOutput = execSync(
      `go run -ldflags "-s -w" . --help 2>&1`,
      {cwd: projectRoot, encoding: 'utf8', timeout: 30000}
    );
    return parseCobraHelp(helpOutput, binaryName);
  } catch (err) {
    return {name: binaryName, description: '', commands: [], flags: []};
  }
}

function parseCobraHelp(output, name) {
  const lines = output.split('\n');
  let description = '';
  const commands = [];
  const flags = [];
  let section = '';

  for (const line of lines) {
    if (line.startsWith('Usage:')) {
      continue;
    }
    if (line === 'Available Commands:') {
      section = 'commands';
      continue;
    }
    if (line === 'Flags:' || line === 'Global Flags:') {
      section = 'flags';
      continue;
    }
    if (line.startsWith('Use "')) {
      continue;
    }

    if (section === 'commands') {
      const match = line.match(/^\s{2}(\S+)\s+(.+)$/);
      if (match) {
        commands.push({name: match[1], description: match[2].trim()});
      }
    } else if (section === 'flags') {
      const trimmed = line.trim();
      if (trimmed) {
        flags.push(trimmed);
      }
    } else if (!section && line.trim() && !description) {
      description = line.trim();
    }
  }

  return {name, description, commands, flags};
}

module.exports = {generateDocs};
