import { AxiosError } from 'axios';
export interface ErrorObject {
    network?: {
        url: string;
        status: number;
        msg: string;
        err: AxiosError;
    };
    generic?: Error;
}
