import { Position, WalletBalance } from 'src/npm-package-base/models';
import { Coin, Leverage, Percentage, Side } from 'src/npm-package-base/types';

export const EXCHANGE_SERVICE = 'EXCHANGE_SERVICE';

export abstract class ExchangeService {
  abstract setLeverageAsync(commonId: string, coin: Coin | string, leverage: Leverage): Promise<void>;
  abstract getWalletBalanceAsync(commonId: string): Promise<WalletBalance>;
  abstract getPositionInfoAsync(commonId: string): Promise<Position[]>;
  abstract getPositionsHistory(commonId: string): Promise<any[]>;
  abstract newOrderAsync(commonId: string, coin: Coin | string, percentage: Percentage, side: Side, leverage: Leverage): Promise<void>;
  abstract openPositionAsync(commonId: string, coin: Coin | string, side: Side, qty: string): Promise<void>;
  abstract getPriceAsync(commonId: string, coin: Coin | string): Promise<number>;
  abstract closeWholePositionAsync(commonId: string, coin: Coin | string): Promise<void>;
  abstract closePositionAsync(commonId: string, coin: Coin | string, quantity?: string): Promise<void>;
  abstract setStopLossAsync(commonId: string, coin: Coin | string, stopLossPrice: number): Promise<void>;
  abstract getProperOrderSize(commonId: string, coin: Coin | string, qty: number): Promise<string>;
}
