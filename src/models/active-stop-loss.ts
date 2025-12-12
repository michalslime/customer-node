import { Coin } from "src/npm-package-base/types";

export class ActiveStopLoss {
    coin: Coin;
    price: number;
    timestamp: number;
}

export class PnlStopLoss {
    coin: Coin;
    value: number | null;
}