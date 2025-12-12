import { Coin, Side } from "./types";

export class Position {
    coin: Coin;
    symbol: string;
    side: Side;
    takeProfit?: number;
    stopLoss?: number;
    price: number;
    avgPrice: number;
    pnl: number;
    size: number;
    profitPercent: number;
    updated: number;
    leverage: number;
    originalPosition: any;
}


export class WalletBalance {
    availableAmount: number;
    totalAmount: number;
}