export interface Args {
  userId?: string;
  help?: boolean;
  bundle?: boolean;
  plugin?: string;
  create?: boolean;
  public?: boolean;
  instance?: 'install' | 'machine-install';
  run?: boolean;
  cms?: string;
  cloudOrigin?: string;
  login?: boolean;
  logout?: boolean;
  email?: string;
  password?: string;
  deploy?: string;
  otp?: string;
  terminalLogin?: boolean;
  install?: boolean;
  shim?: string;
  version?: string;
  update?: boolean;
  migration?: string;
  collectionPrfx?: string;
  toCollectionPrfx?: string;
  dbUrl?: string;
  toDBUrl?: string;
  cmsClientOrigin?: string;
  cmsClientApiKey?: string;
  cmsClientApiSecret?: string;
  most?: string;
  website?: string;
  licensePath?: string;

  instanceId?: string;

  function?: 'create';
  event?: 'create';
  job?: 'create';

  projectName?: string;

  noPrompt?: boolean;
}
