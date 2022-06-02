import type { PropV3Value } from "./main";

export interface PropV3GroupPointerData {
  _id: string;
}

export interface PropV3ValueGroupPointerData {
  _id: string;
  items: Array<{
    props: PropV3Value[];
  }>;
}
