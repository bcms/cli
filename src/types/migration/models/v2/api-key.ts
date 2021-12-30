import type { UserV2PolicyCRUD } from './user';
import type { EntityV2 } from './_entity';

export interface ApiKeyV2Access {
  templates: Array<UserV2PolicyCRUD & { _id: string }>;
  functions: Array<{
    name: string;
  }>;
}

export interface ApiKeyV2 extends EntityV2 {
  userId: string;
  name: string;
  desc: string;
  blocked: boolean;
  secret: string;
  access: ApiKeyV2Access;
}
