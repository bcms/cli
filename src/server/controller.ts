import {
  createController,
  createControllerMethod,
} from '@becomes/purple-cheetah';
import { Controller, HTTPStatus } from '@becomes/purple-cheetah/types';
import { EventManager } from '../event';
import type { BCMSCloudSdk } from '@becomes/cms-cloud-client';

export function createServerController({
  client,
}: {
  client: BCMSCloudSdk;
}): Controller {
  return createController({
    name: 'Server controller',
    path: '',
    methods() {
      return {
        login: createControllerMethod<void, string>({
          path: '/login',
          type: 'get',
          async handler({ request, errorHandler, response, logger }) {
            if (typeof request.query.otp !== 'string') {
              throw errorHandler.occurred(
                HTTPStatus.BAD_REQUEST,
                'Missing query "otp".',
              );
            }
            const [userId, otp] = (request.query.otp as string).split('_');
            try {
              await client.auth.loginOtp({ otp, userId });
            } catch (error) {
              logger.error('login', 'Failed to authenticate with BCMS Cloud');
              logger.error('login', error);
              throw errorHandler.occurred(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                'Fail to authenticate',
              );
            }
            EventManager.trigger('login');
            response.setHeader('Content-Type', 'text/html');
            return `<h1>You are now logged in and you can safely close this tab.</h1>`;
          },
        }),
      };
    },
  });
}
