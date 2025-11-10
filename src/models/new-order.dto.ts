import { Coin, Leverage, Percentage, Side } from "./bybit-investing";

export class NewOrderDto {
    coin: Coin;
    percentage: Percentage;
    side: Side;
    leverage: Leverage;
}