import type { ApiClient } from '@becomes/cms-cloud-client/types';
import {
  createController,
  createControllerMethod,
} from '@becomes/purple-cheetah';
import { Controller, HTTPStatus } from '@becomes/purple-cheetah/types';
import { EventManager } from '../event';

export function createServerController({
  client,
}: {
  client: ApiClient;
}): Controller {
  return createController({
    name: 'Server controller',
    path: '',
    methods() {
      return {
        login: createControllerMethod<void, string>({
          path: '/login',
          type: 'get',
          async handler({ request, errorHandler, response }) {
            if (typeof request.query.otp !== 'string') {
              throw errorHandler.occurred(
                HTTPStatus.BAD_REQUEST,
                'Missing query "otp".',
              );
            }
            await client.auth.loginOtp(request.query.otp as string);
            EventManager.trigger('login');
            response.setHeader('Content-Type', 'text/html');
            return `<h1>You are not logged in and you can safely close this tab.</h1>`;
          },
        }),
      };
    },
  });
}
