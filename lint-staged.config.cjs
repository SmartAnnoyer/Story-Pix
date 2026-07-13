const path = require('node:path');

const toWorkspacePaths = (files, workspace) => {
  const root = path.resolve(workspace);
  return files
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
    .map((file) => `"${file}"`)
    .join(' ');
};

module.exports = {
  'frontend/**/*.{ts,tsx}': (files) => {
    const list = toWorkspacePaths(files, 'frontend');
    return [
      `npm exec --workspace=frontend -- eslint --fix ${list}`,
      `npm exec --workspace=frontend -- prettier --write ${list}`,
    ];
  },
  'backend/**/*.ts': (files) => {
    const list = toWorkspacePaths(files, 'backend');
    return [
      `npm exec --workspace=backend -- eslint --fix ${list}`,
      `npm exec --workspace=backend -- prettier --write ${list}`,
    ];
  },
};
