import { prompt } from 'inquirer';
import type { Args } from './types';
import { FunctionTemplates } from './templates';
import { createFS } from '@banez/fs';
import type { ApiClient } from '@becomes/cms-cloud-client/types';

const fs = createFS({
  base: process.cwd(),
});

export class Function {
  static async resolve({
    args,
  }: {
    args: Args;
    client: ApiClient;
  }): Promise<void> {
    if (args.function === 'create') {
      await this.create(args);
    }
  }
  static async create(args: Args): Promise<void> {
    const result = await prompt<{ functionName: string; public: boolean }>([
      {
        type: 'input',
        name: 'functionName',
        message: 'Enter the function name:',
        validate(value) {
          console.log(value);
          if (!/[^a-z0-9---]/.test(value)) {
            return true;
          }
          return (
            'Please enter a valid name. Name can only contain small letters,' +
            ' numbers and [-] character.'
          );
        },
      },
      {
        type: 'confirm',
        name: 'public',
        message: 'Would you like this function to be public?',
      },
    ]);
    await fs.save(
      ['src', 'functions', `${args.function}.ts`],
      FunctionTemplates.create({
        name: result.functionName
          .split('-')
          .map((e) => e.substring(0, 1).toUpperCase() + e.substring(1))
          .join(' '),
        public: result.public,
      }),
    );
  }
}
