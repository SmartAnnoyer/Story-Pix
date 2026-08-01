/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  // Keep hook lightweight: any non-empty message is allowed.
  // Conventional types (feat/fix/…) are optional, not enforced.
  rules: {
    'header-trim': [0],
    'type-empty': [0],
    'subject-empty': [0],
    'type-enum': [0],
    'subject-case': [0],
    'header-min-length': [2, 'always', 3],
  },
};
