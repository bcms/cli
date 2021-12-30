import type { PropV2 } from './prop';

export interface PropV2GroupPointer {
  _id: string;
  items: Array<{
    props: PropV2[];
  }>;
}
