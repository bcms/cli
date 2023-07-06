#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as path from 'path';
import { createCloudApiClient } from '../cloud-client';
import { CMS } from '../cms';
import { Function } from '../function';
import { Instance } from '../instance';
import { Plugin } from '../plugin';
import { parseArgs } from '../util';
import { login } from '../login';
import { logout } from '../logout';
import {
  createBodyParserMiddleware,
  createCorsMiddleware,
  createPurpleCheetah,
  createRequestLoggerMiddleware,
} from '@becomes/purple-cheetah';
import type { PurpleCheetah } from '@becomes/purple-cheetah/types';
import { createServerController } from '../server';
import { Config } from '../config';
import { createFS } from '@banez/fs';
import { Migration } from '../migration';
import { Most } from '../most';
import { Shim } from '../shim';
import { help } from '../help';
import { Website } from '../website';
import { prompt } from 'inquirer';
import { updateCli } from '../update-cli';
import { getVersionInfo } from '../check-version';

async function main() {
  const updateCliInfo = await getVersionInfo();
  console.log(updateCliInfo);
  if (updateCliInfo.local !== 'none' || updateCliInfo.global) {
    const answer = await prompt<{ yes: boolean }>([
      {
        message:
          'New version of the CLI is available. Would you like to update it?',
        type: 'confirm',
        name: 'yes',
      },
    ]);
    if (answer.yes) {
      await updateCli(updateCliInfo);
      return;
    }
  }
  const fs = createFS({
    base: Config.fsDir,
  });
  const rootFs = createFS({
    base: process.cwd(),
  });
  const args = parseArgs(process.argv);
  if (!args.cloudOrigin) {
    args.cloudOrigin = 'https://cloud.thebcms.com';
  }
  if (!(await fs.exist(Config.fsDir))) {
    await fs.mkdir(Config.fsDir);
  }
  const client = await createCloudApiClient({
    args,
  });
  await new Promise<PurpleCheetah>((resolve, reject) => {
    try {
      createPurpleCheetah({
        port: 1278,
        silentLogs: true,
        staticContentDir: path.join(__dirname, '..', 'public'),
        logger: {
          doNotOverrideProcess: true,
          silentLogger: true,
          saveToFile: {
            interval: 1000,
            output: path.join(Config.fsDir, 'logs'),
          },
        },
        middleware: [
          createCorsMiddleware(),
          createBodyParserMiddleware(),
          createRequestLoggerMiddleware(),
        ],
        controllers: [createServerController({ client })],
        onReady(pc) {
          resolve(pc);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
  if (args.login) {
    await login({ client, args });
  } else if (args.logout) {
    await logout({ args, client });
  } else if (typeof args.cms === 'string') {
    await CMS.resolve({ args, client });
  } else if (typeof args.plugin === 'string') {
    await Plugin.resolve({ args, client });
  } else if (typeof args.function === 'string') {
    await Function.resolve({ args, client });
  } else if (typeof args.instance === 'string') {
    await Instance.resolve({ args, client });
  } else if (typeof args.migration === 'string') {
    await Migration.resolve({ args, client, rootFs });
  } else if (args.most) {
    await Most.resolve({ args });
  } else if (typeof args.shim === 'string') {
    await Shim.resolve({ args, client });
  } else if (args.website) {
    await Website.resolve({ args, client });
  } else if (args.help) {
    await help();
  } else if (typeof args.version === 'string') {
    let packageJson: any;
    if (await rootFs.exist(path.join(__dirname, '..', 'package.json'), true)) {
      packageJson = JSON.parse(
        await rootFs.readString(path.join(__dirname, '..', 'package.json')),
      );
    } else {
      packageJson = JSON.parse(
        await rootFs.readString(
          path.join(__dirname, '..', '..', 'package.json'),
        ),
      );
    }
    console.log('BCMS CLI version ------>', packageJson.version);
  }
  setTimeout(() => {
    process.exit(0);
  }, 200);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
