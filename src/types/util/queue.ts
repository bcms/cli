export interface QueueFunction<Result> {
  (): Promise<Result>;
}

export interface Queue<Result> {
  (fn: QueueFunction<Result>): Promise<Result>;
}
