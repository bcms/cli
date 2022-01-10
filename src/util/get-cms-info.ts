import { prompt } from 'inquirer';
import type { GetCmsInfoResult, MigrationConfig } from '../types';
import type { Args } from './args';

export async function getCmsInfo({
  args,
  config,
}: {
  args: Args;
  config: MigrationConfig;
}): Promise<GetCmsInfoResult> {
  const cmsInfo: GetCmsInfoResult = {
    origin: args.cmsClientOrigin
      ? args.cmsClientOrigin
      : config.v2
      ? config.v2.cms
        ? config.v2.cms.origin
          ? config.v2.cms.origin
          : ''
        : ''
      : '',
    apiKey: args.cmsClientApiKey
      ? args.cmsClientApiKey
      : config.v2
      ? config.v2.cms
        ? config.v2.cms.api
          ? config.v2.cms.api.id
            ? config.v2.cms.api.id
            : ''
          : ''
        : ''
      : '',
    apiSecret: args.cmsClientApiSecret
      ? args.cmsClientApiSecret
      : config.v2
      ? config.v2.cms
        ? config.v2.cms.api
          ? config.v2.cms.api.secret
            ? config.v2.cms.api.secret
            : ''
          : ''
        : ''
      : '',
  };
  if (cmsInfo.origin && cmsInfo.apiKey && cmsInfo.apiSecret) {
    return cmsInfo;
  }
  const answers = await prompt<GetCmsInfoResult>([
    cmsInfo.origin
      ? undefined
      : {
          type: 'input',
          message: 'Enter a URL of the BCMS (ex. https://cms.example.com)',
          name: 'origin',
        },
    cmsInfo.apiKey
      ? undefined
      : {
          type: 'input',
          message: 'Enter the API key ID',
          name: 'apiKey',
        },
    cmsInfo.apiSecret
      ? undefined
      : {
          type: 'password',
          message: 'Enter the API key Secret',
          name: 'apiSecret',
        },
  ]);
  if (!cmsInfo.origin) {
    cmsInfo.origin = answers.origin;
  }
  if (!cmsInfo.apiKey) {
    cmsInfo.apiKey = answers.apiKey;
  }
  if (!cmsInfo.apiSecret) {
    cmsInfo.apiSecret = answers.apiSecret;
  }
  return cmsInfo;
}
