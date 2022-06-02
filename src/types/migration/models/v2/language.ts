import type { EntityV2 } from './_entity';

export interface LanguageV2 extends EntityV2 {
  userId: string;
  code: string;
  name: string;
  nativeName: string;
  def: boolean;
}
