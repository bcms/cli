export interface Args {
  bundle?: boolean;
  plugin?: string;
  create?: boolean;
  function?: string;
  public?: boolean;
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
    name: string,
    type: 'string' | 'boolean',
  ): T | undefined {
    if (type === 'string') {
      return args[name] as T;
    } else {
      return (args[name] === '' || args[name] === 'true' || false) as T;
    }
  }
  return {
    bundle: getArg('--bundle', 'boolean'),
    plugin: getArg('--bundle', 'string'),
    create: getArg('--create', 'boolean'),
    function: getArg('--function', 'string'),
    public: getArg('--public', 'boolean'),
  };
}
