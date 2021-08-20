#!/usr/bin/env node

import { Function } from '../function';
import { Plugin } from '../plugin';
import { parseArgs } from '../util';

async function main() {
  const args = parseArgs(process.argv);
  if (args.bundle) {
    if (args.plugin || args.plugin === '') {
      await Plugin.bundle(args);
    }
  } else if (args.create) {
    if (args.function || args.function === '') {
      await Function.create(args);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
