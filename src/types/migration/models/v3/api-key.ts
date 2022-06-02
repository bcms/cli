import type { UserV3PolicyCRUD } from './user';
import type { EntityV3 } from './_entity';

export interface ApiKeyV3Access {
  templates: Array<UserV3PolicyCRUD & { _id: string }>;
  functions: Array<{
    name: string;
  }>;
}

export interface ApiKeyV3 extends EntityV3 {
  userId: string;
  name: string;
  desc: string;
  blocked: boolean;
  secret: string;
  access: ApiKeyV3Access;
}
