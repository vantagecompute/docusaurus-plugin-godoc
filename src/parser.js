/**
 * Parses the output of `go doc -all <package>` into structured sections.
 *
 * go doc -all output format:
 *   - Package comment block at the top
 *   - CONSTANTS section
 *   - VARIABLES section
 *   - FUNCTIONS section (each: signature line, then indented doc comment)
 *   - TYPES section (each: type declaration, then indented doc comment, then methods)
 */

function parseGoDoc(raw, pkgName) {
  const lines = raw.split('\n');

  const result = {
    packageName: pkgName,
    overview: '',
    constants: [],
    variables: [],
    functions: [],
    types: [],
  };

  let i = 0;

  // Skip "package <name> // import ..." line
  if (lines[i] && lines[i].startsWith('package ')) {
    i++;
  }

  // Collect overview (everything before first section header)
  const overviewLines = [];
  while (i < lines.length && !isSectionHeader(lines[i])) {
    overviewLines.push(lines[i]);
    i++;
  }
  result.overview = overviewLines.join('\n').trim();

  // Parse sections
  while (i < lines.length) {
    const line = lines[i];

    if (line === 'CONSTANTS') {
      i++;
      const {items, nextIndex} = parseConstVarSection(lines, i);
      result.constants = items;
      i = nextIndex;
    } else if (line === 'VARIABLES') {
      i++;
      const {items, nextIndex} = parseConstVarSection(lines, i);
      result.variables = items;
      i = nextIndex;
    } else if (line === 'FUNCTIONS') {
      i++;
      const {items, nextIndex} = parseFunctionSection(lines, i);
      result.functions = items;
      i = nextIndex;
    } else if (line === 'TYPES') {
      i++;
      const {items, nextIndex} = parseTypeSection(lines, i);
      result.types = items;
      i = nextIndex;
    } else {
      i++;
    }
  }

  return result;
}

function isSectionHeader(line) {
  return line === 'CONSTANTS' || line === 'VARIABLES' ||
         line === 'FUNCTIONS' || line === 'TYPES';
}

function isTypeOrFuncSignature(line) {
  return /^(func|type|var|const)\s/.test(line);
}

function parseConstVarSection(lines, startIndex) {
  const items = [];
  let i = startIndex;

  while (i < lines.length && !isSectionHeader(lines[i])) {
    const line = lines[i];
    if (line.startsWith('const ') || line.startsWith('var ') || line === 'const (' || line === 'var (') {
      const declLines = [line];
      i++;
      if (line.endsWith('(')) {
        while (i < lines.length && lines[i] !== ')') {
          declLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          declLines.push(lines[i]);
          i++;
        }
      }

      const docLines = [];
      while (i < lines.length && lines[i].startsWith('    ')) {
        docLines.push(lines[i].substring(4));
        i++;
      }

      items.push({
        declaration: declLines.join('\n'),
        doc: docLines.join('\n').trim(),
      });
    } else {
      i++;
    }
  }

  return {items, nextIndex: i};
}

function parseFunctionSection(lines, startIndex) {
  const items = [];
  let i = startIndex;

  while (i < lines.length && !isSectionHeader(lines[i])) {
    const line = lines[i];
    if (line.startsWith('func ')) {
      const signature = line;
      i++;

      const docLines = [];
      while (i < lines.length && lines[i].startsWith('    ') && !lines[i].startsWith('    func ')) {
        docLines.push(lines[i].substring(4));
        i++;
      }

      const name = extractFuncName(signature);
      items.push({
        name,
        signature,
        doc: docLines.join('\n').trim(),
      });
    } else {
      i++;
    }
  }

  return {items, nextIndex: i};
}

function parseTypeSection(lines, startIndex) {
  const items = [];
  let i = startIndex;

  while (i < lines.length && !isSectionHeader(lines[i])) {
    const line = lines[i];
    if (line.startsWith('type ')) {
      const declLines = [line];
      i++;

      // Multi-line type (struct, interface)
      if (line.includes('{') && !line.includes('}')) {
        while (i < lines.length && !lines[i].startsWith('}')) {
          declLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          declLines.push(lines[i]);
          i++;
        }
      }

      const docLines = [];
      while (i < lines.length && lines[i].startsWith('    ') && !lines[i].match(/^    func /)) {
        docLines.push(lines[i].substring(4));
        i++;
      }

      const methods = [];
      const constructors = [];
      // go doc lists both receiver methods (func (r *T) M()) and
      // associated functions (func NewT(), func FromContext()) under
      // the TYPES section after a type definition. Blank lines may
      // separate the type doc from associated functions.
      while (i < lines.length && lines[i].trim() === '') i++;
      while (i < lines.length && lines[i].startsWith('func ')) {
        const funcLine = lines[i];
        i++;
        const funcDocLines = [];
        while (i < lines.length && lines[i].startsWith('    ')) {
          funcDocLines.push(lines[i].substring(4));
          i++;
        }
        const entry = {
          name: isMethodOfType(funcLine) ? extractMethodName(funcLine) : extractFuncName(funcLine),
          signature: funcLine,
          doc: funcDocLines.join('\n').trim(),
        };
        if (isMethodOfType(funcLine)) {
          methods.push(entry);
        } else {
          constructors.push(entry);
        }
        // Skip blank lines between associated functions
        while (i < lines.length && lines[i].trim() === '') i++;
      }

      const name = extractTypeName(line);
      items.push({
        name,
        declaration: declLines.join('\n'),
        doc: docLines.join('\n').trim(),
        constructors,
        methods,
      });
    } else {
      i++;
    }
  }

  return {items, nextIndex: i};
}

function extractFuncName(sig) {
  const match = sig.match(/^func\s+(\w+)/);
  return match ? match[1] : 'unknown';
}

function extractTypeName(line) {
  const match = line.match(/^type\s+(\w+)/);
  return match ? match[1] : 'unknown';
}

function extractMethodName(sig) {
  // func (r *Receiver) MethodName(...)
  const match = sig.match(/\)\s+(\w+)\s*\(/);
  return match ? match[1] : extractFuncName(sig);
}

function isMethodOfType(line) {
  return /^func\s+\(/.test(line);
}

module.exports = {parseGoDoc};
