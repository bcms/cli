import type {
  ApiClient,
  InstanceProtected,
  Org,
} from '@becomes/cms-cloud-client/types';
import { prompt } from 'inquirer';

export class Select {
  static async orgAndInstance({ client }: { client: ApiClient }): Promise<{
    org: Org;
    instance: InstanceProtected;
  }> {
    const orgs = await client.org.getAll();
    const instances = await client.instance.getAll();
    const promptResult = await prompt<{ orgId: string; instanceId: string }>([
      {
        name: 'orgId',
        type: 'list',
        choices: orgs.map((org) => {
          return {
            name: org.name,
            value: org._id,
          };
        }),
        message: 'Select an organization:',
      },
      {
        name: 'instanceId',
        type: 'list',
        choices: instances.map((inst) => {
          return {
            name: inst.name,
            value: inst._id,
          };
        }),
        message: 'Select an instance:',
      },
    ]);
    const org = orgs.find((e) => e._id === promptResult.orgId);
    if (!org) {
      throw Error(
        `Organization with ID "${promptResult.orgId}" does not exist.`,
      );
    }
    const instance = instances.find((e) => e._id === promptResult.instanceId);
    if (!instance) {
      throw Error(
        `Instance with ID "${promptResult.instanceId}" does not exist.`,
      );
    }
    return { org, instance };
  }
}
