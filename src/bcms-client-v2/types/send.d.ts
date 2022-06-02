import { AxiosRequestConfig } from 'axios';
export declare type Send = <T>(config: AxiosRequestConfig, auth?: boolean) => Promise<T>;
