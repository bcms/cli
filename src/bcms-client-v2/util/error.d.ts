export interface ErrorWrapperPrototype {
    exec<T>(fn: () => Promise<T>): Promise<T>;
}
export declare const ErrorWrapper: ErrorWrapperPrototype;
