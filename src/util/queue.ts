import type { Queue, QueueFunction } from "../types";

export function createQueue<Result>({
  type,
}: {
  type: 'serial-complete' | 'parallel-complete';
}): Queue<Result> {
  let working = false;
  const items: Array<{
    fn: QueueFunction<Result>;
    resolve: (result: Result) => void;
    reject: (error: unknown) => void;
  }> = [];

  async function next(result?: Result): Promise<void> {
    const item = items.pop();
    if (item) {
      if (type === 'parallel-complete' && result) {
        item.resolve(result);
      } else {
        try {
          result = await item.fn();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
      next(result);
    } else {
      working = false;
    }
  }

  return async (fn) => {
    return await new Promise<Result>((resolve, reject) => {
      items.push({
        fn,
        resolve,
        reject,
      });
      if (!working) {
        working = true;
        next();
      }
    });
  };
}
