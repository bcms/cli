import type { EntityV2 } from './_entity';

export interface UserV2Personal {
  firstName: string;
  lastName: string;
  avatarUri: string;
}
export interface UserV2Address {
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  street?: {
    name: string;
    number: string;
  };
}
export interface UserV2PolicyCRUD {
  get: boolean;
  post: boolean;
  put: boolean;
  delete: boolean;
}
export interface UserV2Policy {
  media: UserV2PolicyCRUD;
  customPortal: UserV2PolicyCRUD;
  templates: Array<{ _id: string } & UserV2PolicyCRUD>;
  webhooks: Array<{ _id: string } & UserV2PolicyCRUD>;
  plugins?: Array<{ name: string } & UserV2PolicyCRUD>;
}
export interface UserV2CustomPool {
  personal: UserV2Personal;
  address: UserV2Address;
  policy: UserV2Policy;
}

export interface RefreshTokenV2 {
  value: string;
  expAt: number;
}

export interface UserV2Permission {
  name: string;
}
export interface UserV2Role {
  name: string;
  permissions: UserV2Permission[];
}

export interface UserV2 extends EntityV2 {
  username: string;
  email: string;
  password: string;
  roles: UserV2Role[];
  refreshTokens: RefreshTokenV2[];
  customPool: UserV2CustomPool;
}
