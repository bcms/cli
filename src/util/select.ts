import type {
  BCMSCloudSdk,
  InstanceProtectedWithStatus,
  Org,
} from '@becomes/cms-cloud-client';
import { prompt } from 'inquirer';

export class Select {
  static async cloudOrLocal({ client }: { client: BCMSCloudSdk }): Promise<{
    local?: boolean;
    cloud?: {
      instance: InstanceProtectedWithStatus;
    };
  }> {
    const result = await prompt<{ type: 'cloud' | 'local' }>([
      {
        message: 'Which type of BCMS you want to connect to?',
        name: 'type',
        type: 'list',
        choices: [
          {
            name: 'Live',
            value: 'cloud',
          },
          {
            name: 'Local',
            value: 'local',
          },
        ],
      },
    ]);
    if (result.type === 'local') {
      return {
        local: true,
      };
    }
    return {
      cloud: await Select.instance({ client }),
    };
  }

  static async orgAndInstance({ client }: { client: BCMSCloudSdk }): Promise<{
    org: Org;
    instance: InstanceProtectedWithStatus;
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

  static async instance({ client }: { client: BCMSCloudSdk }): Promise<{
    instance: InstanceProtectedWithStatus;
  }> {
    const instances = await client.instance.getAll();
    const instResult = await prompt<{ instanceId: string }>([
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
    const instance = instances.find((e) => e._id === instResult.instanceId);
    if (!instance) {
      throw Error(
        `Instance with ID "${instResult.instanceId}" does not exist.`,
      );
    }
    return { instance };
  }

  static async instanceDomain({
    instance,
    client,
  }: {
    instance: InstanceProtectedWithStatus;
    client: BCMSCloudSdk;
  }): Promise<string> {
    const domains = await client.instanceDomain.getAll({
      instanceId: instance._id,
    });
    let origin = 'https://' + instance.domain;
    if (domains.length > 0) {
      const selectedDomain = await prompt<{ domain: string }>([
        {
          message: 'Which domain would you like to use?',
          name: 'domain',
          type: 'list',
          choices: [
            {
              name: 'localhost',
              value: 'localhost',
            },
            {
              name: instance.domain,
              value: instance.domain,
            },
            ...domains.map((domain) => {
              return {
                name: domain.name,
                value: domain.name,
              };
            }),
          ],
        },
      ]);
      if (selectedDomain.domain === 'localhost') {
        origin = `http://localhost:8080`;
      } else if (selectedDomain.domain !== instance.domain) {
        const protocol = await prompt<{ value: string }>([
          {
            message: 'Which protocol should be used?',
            name: 'protocol',
            type: 'list',
            choices: [
              {
                name: 'HTTP',
                value: 'http',
              },
              {
                name: 'HTTPS',
                value: 'https',
              },
            ],
          },
        ]);
        origin = `${protocol.value}://${selectedDomain.domain}`;
      }
    }
    return origin;
  }
}
