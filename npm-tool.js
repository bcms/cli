const { createFS } = require('@banez/fs');
const { createConfig } = require('@banez/npm-tool');

const fs = createFS({
  base: process.cwd(),
});

module.exports = createConfig({
  bundle: {
    extend: [
      {
        title: 'Copy public assets.',
        async task() {
          await fs.copy(['src', 'public'], ['dist', 'public']);
          await fs.copy(
            ['src', 'help', 'general.txt'],
            ['dist', 'help', 'general.txt'],
          );
        },
      },
      {
        title: 'Copy BCMS Client V2.',
        async task() {
          await fs.copy(['src', 'bcms-client-v2'], ['dist', 'bcms-client-v2']);
        },
      },
      {
        title: 'Copy init data',
        async task() {
          await fs.copy(['src', 'init'], ['dist', 'init']);
        },
      },
    ],
  },
});
