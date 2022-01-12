const fse = require('fs-extra');
const path = require('path');
const { createConfig } = require('@banez/npm-tool');

module.exports = createConfig({
  bundle: {
    extend: [
      {
        title: 'Copy public assets.',
        async task() {
          await fse.copy(
            path.join(process.cwd(), 'src', 'public'),
            path.join(process.cwd(), 'dist', 'public'),
          );
        },
      },
      {
        title: 'Copy BCMS Client V2.',
        async task() {
          await fse.copy(
            path.join(process.cwd(), 'src', 'bcms-client-v2'),
            path.join(process.cwd(), 'dist', 'bcms-client-v2'),
          );
        },
      },
    ],
  },
});
