#!/usr/bin/env node

const fs = require('fs');
const yaml = require('js-yaml');

if (process.argv.length !== 4) {
  console.error('Usage: node openapi-to-function.js <input.yaml> <output.json>');
  process.exit(1);
}

const [inputFile, outputFile] = process.argv.slice(2);

try {
  const doc = yaml.load(fs.readFileSync(inputFile, 'utf8'));
  const functions = [];

  const paths = doc.paths || {};
  for (const [path, pathObj] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(pathObj)) {
      const opId = op.operationId || `${method}_${path.replace(/[\/{}]/g, '_')}`;
      const parameters = (op.parameters || []).reduce((acc, param) => {
        acc.properties[param.name] = {
          type: param.schema?.type || 'string',
          description: param.description || '',
        };
        if (param.required) {
          acc.required.push(param.name);
        }
        return acc;
      }, { type: 'object', properties: {}, required: [] });

      if (!parameters.required.length) delete parameters.required;

      functions.push({
        name: opId,
        description: op.summary || op.description || `Call ${method.toUpperCase()} ${path}`,
        parameters,
      });
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(functions, null, 2));
  console.log(`✅ Functions written to ${outputFile}`);
} catch (e) {
  console.error('❌ Failed to convert:', e.message);
  process.exit(1);
}

