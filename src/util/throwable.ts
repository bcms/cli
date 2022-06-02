import type { Throwable } from '../types';

let throwable: Throwable;

export function useThrowable(): Throwable {
  if (!throwable) {
    throwable = async <ThrowableResult, OnSuccessResult, OnErrorResult>(
      throwableFn: () => Promise<ThrowableResult>,
      onSuccess?: (data: ThrowableResult) => Promise<OnSuccessResult>,
      onError?: (error: unknown) => Promise<OnErrorResult>,
    ): Promise<OnSuccessResult | OnErrorResult> => {
      let output: ThrowableResult;
      try {
        output = await throwableFn();
      } catch (e) {
        if (onError) {
          return await onError(e);
        } else {
          // eslint-disable-next-line no-console
          console.error(e);
          return e as OnErrorResult;
        }
      }
      if (onSuccess) {
        return await onSuccess(output);
      }
      return undefined as never;
    };
  }
  return throwable;
}
