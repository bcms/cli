import type { ObjectSchema } from '@banez/object-utility/types';

export interface MigrationConfig {
  database?: {
    from?: {
      url?: string;
      collectionPrefix?: string;
    };
    to?: {
      url?: string;
      collectionPrefix?: string;
    };
  };
  v2?: {
    cms?: {
      origin?: string;
      api?: {
        id: string;
        secret: string;
      };
    };
  };
}

export const MigrationConfigSchema: ObjectSchema = {
  database: {
    __type: 'object',
    __required: false,
    __child: {
      from: {
        __type: 'object',
        __required: false,
        __child: {
          url: {
            __type: 'string',
            __required: false,
          },
          collectionPrefix: {
            __type: 'string',
            __required: false,
          },
        },
      },
      to: {
        __type: 'object',
        __required: false,
        __child: {
          url: {
            __type: 'string',
            __required: false,
          },
          collectionPrefix: {
            __type: 'string',
            __required: false,
          },
        },
      },
    },
  },
  v2: {
    __type: 'object',
    __required: false,
    __child: {
      cms: {
        __type: 'object',
        __required: false,
        __child: {
          origin: {
            __type: 'string',
            __required: false,
          },
          api: {
            __type: 'object',
            __required: false,
            __child: {
              id: {
                __type: 'string',
                __required: true,
              },
              secret: {
                __type: 'string',
                __required: true,
              },
            },
          },
        },
      },
    },
  },
};
