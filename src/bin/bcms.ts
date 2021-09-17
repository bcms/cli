#!/usr/bin/env node

import { Function } from '../function';
import { Instance } from '../instance';
import { Plugin } from '../plugin';
import { parseArgs } from '../util';

async function main() {
  const args = parseArgs(process.argv);
  if (args.plugin || args.plugin === '') {
    if (args.bundle) {
      await Plugin.bundle(args);
    }
  } else if (args.function || args.function === '') {
    if (args.create) {
      await Function.create(args);
    }
  } else if (args.instance || args.instance === '') {
    if (args.run) {
      await Instance.run(args);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
