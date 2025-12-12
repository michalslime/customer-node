import { WalletBalance } from 'src/models/wallet';
import { Position } from 'src/npm-package-base/models';
import { Coin, Leverage, Percentage, Side } from 'src/npm-package-base/types';

export const EXCHANGE_SERVICE = 'EXCHANGE_SERVICE';

export abstract class ExchangeService {
  abstract setLeverageAsync(commonId: string, coin: Coin, leverage: Leverage): Promise<void>;
  abstract getWalletBalanceAsync(commonId: string): Promise<WalletBalance>;
  abstract getPositionInfoAsync(commonId: string): Promise<Position[]>;
  abstract getPositionsHistory(commonId: string): Promise<any[]>;
  abstract newOrderAsync(commonId: string, coin: Coin, percentage: Percentage, side: Side, leverage: Leverage): Promise<void>;
  abstract openPositionAsync(commonId: string, coin: Coin, side: Side, qty: number): Promise<void>;
  abstract getPriceAsync(commonId: string, coin: Coin): Promise<number>;
  abstract closeWholePositionAsync(commonId: string, coin: Coin): Promise<void>;
  abstract closePositionAsync(commonId: string, coin: Coin, quantity?: number): Promise<void>;
  abstract setStopLossAsync(commonId: string, coin: Coin, stopLossPrice: number): Promise<void>;
}
