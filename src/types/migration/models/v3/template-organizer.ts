import type { EntityV3 } from './_entity';

export interface TemplateOrganizerV3 extends EntityV3 {
  parentId?: string;
  label: string;
  name: string;
  templateIds: string[];
}
