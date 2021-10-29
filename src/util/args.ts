export interface Args {
  bundle?: boolean;
  plugin?: boolean;
  create?: boolean;
  function?: string;
  public?: boolean;
  instance?: string;
  run?: boolean;
  cms?: string;
  cloudOrigin?: string;
  login?: boolean;
  logout?: boolean;
  email?: string;
  password?: string;
  deploy?: string;
}

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
  return {
    login: getArg(['--login'], 'boolean'),
    logout: getArg(['--logout'], 'boolean'),
    bundle: getArg(['--bundle', '--b'], 'boolean'),
    plugin: getArg(['--plugin', '--pl'], 'boolean'),
    create: getArg(['--create', '--c'], 'boolean'),
    function: getArg(['--function', '--f'], 'string'),
    public: getArg(['--public', '--p'], 'boolean'),
    instance: getArg(['--instance', '--i'], 'string'),
    run: getArg(['--run'], 'boolean'),
    cms: getArg(['--cms'], 'string'),
    deploy: getArg(['--deploy', '--d'], 'string'),
    cloudOrigin: getArg(['--cloud-origin', '--co'], 'string'),
    email: getArg(['--email'], 'string'),
    password: getArg(['--password'], 'string'),
  };
}
