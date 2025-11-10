import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RequestUrlService implements OnModuleInit, OnModuleDestroy {
  private ownUrl = process.env.MY_PUBLIC_URL || '';
  private readonly allowedUrls: string[];

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    const rawSubscribedTo =
      this.configService.get<string>('SUBSCRIBED_TO') ?? '';

    this.allowedUrls = rawSubscribedTo
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
  }

  onModuleInit() {
    this.allowedUrls.forEach(async (url) => {
      console.log('Registering: ' + url);
      const response = await firstValueFrom(
        this.http.post(
          `${url}/customers/register`,
          {},
          {
            headers: {
              Origin: this.ownUrl,
            },
          },
        ),
      );
    });
  }

  onModuleDestroy() {
    this.allowedUrls.forEach((url) => {
      this.http.delete(`${url}/customers/register`);
    });
  }

  public setOwnUrl(url: string) {
    console.log('yea')
    this.ownUrl = url;
  }

  public isRequestUrlAllowed(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.allowedUrls.some((allowed) => {
        try {
          const allowedParsed = new URL(allowed);
          return allowedParsed.origin === parsed.origin;
        } catch {
          return url.startsWith(allowed);
        }
      });
    } catch {
      return false;
    }
  }
}
