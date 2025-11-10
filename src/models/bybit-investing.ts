import { PipeTransform, BadRequestException, Injectable } from '@nestjs/common';

export type Coin = 'BTC' | 'ETH' | 'USDT' | 'DOGE' | 'ICP' | 'SOL';

export const USDTCoin: Coin = 'USDT';

@Injectable()
export class CoinValidationPipe implements PipeTransform {
    private readonly allowedCoins: Coin[] = ["BTC", "ETH", "USDT", "DOGE", "ICP"];

    transform(value: any) {
        if (!this.allowedCoins.includes(value)) {
            throw new BadRequestException(`Invalid coin: ${value}. Allowed values: ${this.allowedCoins.join(', ')}`);
        }
        return value as Coin;
    }
}

export type Side = 'Buy' | 'Sell';

export type Percentage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Leverage = 1 | 2 | 5 | 10 | 15 | 20;
