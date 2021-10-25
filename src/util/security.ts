import * as path from 'path';
import { homedir } from 'os';
import type { JWT } from '@becomes/purple-cheetah-mod-jwt/types';
import { System } from '.';
import type { JWTProps } from '../types';
import { useJwtEncoding } from '@becomes/purple-cheetah-mod-jwt';
import { prompt } from 'inquirer';

export class Security {
  private static jwt: JWT<JWTProps> | null;
  private static rawJwt = '';
  private static refreshToken = '';
  private static encoder = useJwtEncoding();
  private static filePath = path.join(homedir(), '.bcms', '_security.json');

  private static async save(): Promise<void> {
    await System.writeFile(
      this.filePath,
      JSON.stringify({
        accessToken: this.rawJwt,
        refreshToken: this.refreshToken,
      }),
    );
  }

  static async init(): Promise<void> {
    if (await System.exist(this.filePath)) {
      try {
        const data = JSON.parse(await System.readFile(this.filePath));
        if (data.jwt) {
          this.rawJwt = '' + data.accessToken;
          const jwtResult = this.encoder.decode<JWTProps>(data.accessToken);
          if (jwtResult instanceof Error) {
            throw jwtResult;
          }
          this.jwt = jwtResult;
          this.refreshToken = data.refreshToken;
        }
      } catch (error) {
        console.error(error);
        this.rawJwt = '';
        this.jwt = null;
        this.refreshToken = '';
        await this.save();
      }
    }
  }

  static getRefreshToken(): string | null {
    return this.refreshToken ? this.refreshToken : null;
  }

  static getJwt(): JWT<JWTProps> | null {
    return this.jwt ? this.jwt : null;
  }

  static getRawJwt(): string | null {
    return this.rawJwt ? this.rawJwt : null;
  }

  static async setAccessToken(accessToken: string): Promise<void> {
    if (!accessToken) {
      this.jwt = null;
      this.rawJwt = '';
      await this.save();
    } else {
      const decodedJwt = this.encoder.decode<JWTProps>(accessToken);
      if (decodedJwt instanceof Error) {
        throw decodedJwt;
      }
      this.jwt = decodedJwt;
      this.rawJwt = accessToken + '';
      await this.save();
    }
  }

  static async setRefreshToken(refreshToken: string): Promise<void> {
    this.refreshToken = refreshToken;
    await this.save();
  }

  static async login() {
    const result = await prompt<{ email: string; password: string }>([
      {
        type: 'input',
        name: 'email',
        message: 'Email: ',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password: ',
      },
    ]);
  }
}
