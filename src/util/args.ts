import type { Args } from '../types';

export function parseArgs(rawArgs: string[]): Args {
  const args: {
    [key: string]: string;
  } = {};
  let i = 2;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    let value = '';
    if (rawArgs[i + 1]) {
      value = rawArgs[i + 1].startsWith('--') ? '' : rawArgs[i + 1];
    }
    args[arg] = value;
    if (value === '') {
      i = i + 1;
    } else {
      i = i + 2;
    }
  }
  function getArg<T extends string | boolean>(
    names: string[],
    type: 'string' | 'boolean',
  ): T | undefined {
    for (let j = 0; j < names.length; j++) {
      const name = names[j];
      if (args[name]) {
        if (type === 'string') {
          return args[name] as T;
        } else {
          return (args[name] === '' || args[name] === 'true' || false) as T;
        }
      }
    }
    if (type === 'string') {
      return args[names[0]] as T;
    } else {
      return (args[names[0]] === '' || args[names[0]] === 'true' || false) as T;
    }
  }
  const groupsRaw: {
    [name: string]: {
      type: 'string' | 'boolean';
    };
  } = {
    login: {
      type: 'boolean',
    },
    logout: {
      type: 'boolean',
    },
    bundle: {
      type: 'boolean',
    },
    plugin: {
      type: 'boolean',
    },
    create: {
      type: 'boolean',
    },
    function: {
      type: 'string',
    },
    public: {
      type: 'boolean',
    },
    instance: {
      type: 'string',
    },
    run: {
      type: 'boolean',
    },
    cms: {
      type: 'string',
    },
    deploy: {
      type: 'string',
    },
    cloudOrigin: {
      type: 'string',
    },
    email: {
      type: 'string',
    },
    password: {
      type: 'string',
    },
    otp: {
      type: 'string',
    },
    terminalLogin: {
      type: 'boolean',
    },
    install: {
      type: 'boolean',
    },
    shim: {
      type: 'boolean',
    },
    version: {
      type: 'string',
    },
    update: {
      type: 'boolean',
    },
    migration: {
      type: 'string',
    },
    collectionPrfx: {
      type: 'string',
    },
    toCollectionPrfx: {
      type: 'string',
    },
    dbUrl: {
      type: 'string',
    },
    toDBUrl: {
      type: 'string',
    },
    cmsClientOrigin: {
      type: 'string',
    },
    cmsClientApiKey: {
      type: 'string',
    },
    cmsClientApiSecret: {
      type: 'string',
    },
    most: {
      type: 'string',
    },
  };
  const groups: {
    [name: string]: {
      name: string;
      type: 'string' | 'boolean';
    };
  } = {};
  for (const groupName in groupsRaw) {
    const groupRaw = groupsRaw[groupName];
    groups[groupName] = {
      name: groupName,
      type: groupRaw.type,
    };
  }
  const myArgs: {
    [name: string]: string;
  } = {
    '--login': groups.login.name,

    '--logout': groups.logout.name,

    '--bundle': groups.bundle.name,
    '--b': groups.bundle.name,

    '--plugin': groups.plugin.name,
    '--pl': groups.plugin.name,

    '--create': groups.create.name,
    '--c': groups.create.name,

    '--function': groups.function.name,
    '--f': groups.function.name,

    '--public': groups.public.name,
    '--p': groups.public.name,

    '--instance': groups.instance.name,
    '--i': groups.instance.name,

    '--run': groups.run.name,
    '--r': groups.run.name,

    '--cms': groups.cms.name,

    '--deploy': groups.deploy.name,
    '--d': groups.deploy.name,

    '--cloud-origin': groups.cloudOrigin.name,
    '--co': groups.cloudOrigin.name,

    '--email': groups.email.name,

    '--password': groups.password.name,

    '--otp': groups.otp.name,

    '--terminal-login': groups.terminalLogin.name,

    '--install': groups.install.name,

    '--shim': groups.shim.name,

    '--version': groups.version.name,
    '--v': groups.version.name,

    '--update': groups.update.name,

    '--migration': groups.migration.name,
    '--mig': groups.migration.name,

    '--collection-prefix': groups.collectionPrfx.name,
    '--col-prfx': groups.collectionPrfx.name,

    '--to-collection-prefix': groups.toCollectionPrfx.name,
    '--to-col-prfx': groups.toCollectionPrfx.name,

    '--db-url': groups.dbUrl.name,
    '--to-db-url': groups.toDBUrl.name,

    '--cms-client-origin': groups.cmsClientOrigin.name,
    '--cco': groups.cmsClientOrigin.name,

    '--cms-client-api-key': groups.cmsClientApiKey.name,
    '--ccak': groups.cmsClientApiKey.name,

    '--cms-client-api-secret': groups.cmsClientApiSecret.name,
    '--ccas': groups.cmsClientApiSecret.name,

    '--most': groups.most.name,
    '--m': groups.most.name,
  };
  const output: {
    [name: string]: string | boolean | undefined;
  } = {};
  const collectedArgs: {
    [group: string]: {
      names: string[];
      type: 'string' | 'boolean';
    };
  } = {};
  for (const argName in myArgs) {
    const groupName = myArgs[argName];
    const group = groups[groupName];
    if (!collectedArgs[groupName]) {
      collectedArgs[groupName] = {
        names: [argName],
        type: group.type,
      };
    } else {
      collectedArgs[groupName].names.push(argName);
    }
  }
  for (const group in collectedArgs) {
    const argData = collectedArgs[group];
    output[group] = getArg(argData.names, argData.type);
  }
  return output;
}
