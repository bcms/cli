import { v4 as uuidv4 } from 'uuid';

interface Callback<T> {
  (type: string, data?: T): Promise<void>;
}

export class EventManager {
  private static subs: {
    [id: string]: {
      type: string;
      cb: Callback<unknown>;
    };
  } = {};

  static async trigger<Data>(type: string, data?: Data): Promise<void> {
    for (const id in this.subs) {
      await this.subs[id].cb(type, data);
    }
  }

  static subscribe<Data>(type: string, cb: Callback<Data>): () => void {
    const id = uuidv4();
    this.subs[id] = {
      type,
      cb: cb as Callback<unknown>,
    };
    return () => {
      delete this.subs[id];
    };
  }
}
