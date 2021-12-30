import type { EntityV3 } from './_entity';

export interface LanguageV3 extends EntityV3 {
  userId: string;
  code: string;
  name: string;
  nativeName: string;
  def: boolean;
}
