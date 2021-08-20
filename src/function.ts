import * as path from 'path';
import { prompt } from 'inquirer';
import { Args, System } from './util';
import { FunctionTemplates } from './templates';

export class Function {
  static async create(args: Args): Promise<void> {
    if (args.function === '' || !/[^a-z0-9---]/.test(args.function as string)) {
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
      ]);
      args.function = result.functionName;
    }
    if (typeof args.public !== 'boolean') {
      const result = await prompt<{ public: boolean }>([
        {
          type: 'confirm',
          name: 'public',
          message: 'Would you like this function to be public?',
        },
      ]);
      args.public = result.public;
    }
    await System.writeFile(
      path.join(process.cwd(), `${args.function}.ts`),
      FunctionTemplates.create({
        name: (args.function as string)
          .split('-')
          .map((e) => e.substring(0, 1).toUpperCase() + e.substring(1))
          .join(' '),
        public: args.public,
      }),
    );
  }
}
