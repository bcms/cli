import type { JWTRoleName } from '@becomes/purple-cheetah-mod-jwt/types';
import type { UserOrg, UserPersonal } from '../models';

export interface JWTProps {
  email: string;
  personal: UserPersonal;
  orgs: UserOrg[];
  instances: Array<{
    iid: string;
    ine: string;
    oi: string;
    one: string;
    r: JWTRoleName;
  }>;
}
