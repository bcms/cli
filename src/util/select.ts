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
    const orgResult = await prompt<{ orgId: string }>([
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
    ]);
    const instResult = await prompt<{ instanceId: string }>([
      {
        name: 'instanceId',
        type: 'list',
        choices: instances
          .filter((inst) => inst.org.id === orgResult.orgId)
          .map((inst) => {
            return {
              name: inst.name,
              value: inst._id,
            };
          }),
        message: 'Select an instance:',
      },
    ]);
    const org = orgs.find((e) => e._id === orgResult.orgId);
    if (!org) {
      throw Error(`Organization with ID "${orgResult.orgId}" does not exist.`);
    }
    const instance = instances.find((e) => e._id === instResult.instanceId);
    if (!instance) {
      throw Error(
        `Instance with ID "${instResult.instanceId}" does not exist.`,
      );
    }
    return { org, instance };
  }
}
