import { Coin, Side } from "./types";

export class Position {
    coin: Coin;
    symbol: string;
    side: Side;
    takeProfit?: number;
    stopLoss?: number;
    price: number;
    pnl: number;
    size: number;
    originalPosition: any;
}