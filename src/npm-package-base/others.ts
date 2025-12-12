import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { Coin } from "./types";

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