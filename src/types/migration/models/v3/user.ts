import type { EntityV3 } from './_entity';

export interface UserV3Permission {
  name: string;
}
export interface UserV3Role {
  name: string;
  permission: UserV3Permission[];
}

export interface UserV3Personal {
  firstName: string;
  lastName: string;
  avatarUri: string;
}
export interface UserV3Address {
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  street?: {
    name: string;
    number: string;
  };
}
export interface UserV3PolicyCRUD {
  get: boolean;
  post: boolean;
  put: boolean;
  delete: boolean;
}
export interface UserV3Policy {
  media: UserV3PolicyCRUD;
  templates: Array<{ _id: string } & UserV3PolicyCRUD>;
  plugins?: Array<{ name: string } & UserV3PolicyCRUD>;
}
export interface UserV3CustomPool {
  personal: UserV3Personal;
  address: UserV3Address;
  policy: UserV3Policy;
}

export interface UserV3 extends EntityV3 {
  username: string;
  email: string;
  password: string;
  roles: UserV3Role[];
  customPool: UserV3CustomPool;
}
