import { Coin, Percentage, Side, Leverage } from "src/npm-package-base/types";

export class NewOrderDto {
    coin: Coin;
    percentage: Percentage;
    side: Side;
    leverage: Leverage;
}