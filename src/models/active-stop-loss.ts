import { Coin } from "src/models/bybit-investing";

export class ActiveStopLoss {
    coin: Coin;
    price: number;
    timestamp: number;
}

export class PnlStopLoss {
    coin: Coin;
    value: number | null;
}