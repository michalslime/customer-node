import { Injectable } from '@nestjs/common';
import { RestClientV5 } from 'bybit-api';
import { ExchangeService } from '../exchange.service';
import { SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';
import { Coin, Leverage, USDTCoin, Percentage, Side } from '../../npm-package-base/types';
import { BybitPositionMapper } from './bybit-mapper';
import { Position, WalletBalance } from '../../npm-package-base/models';

@Injectable()
export class BybitInvestingService extends ExchangeService {
    
    private readonly url: string;
    private readonly bybitRestClientV5: RestClientV5;

    constructor(
        private readonly apiKey: string,
        private readonly secret: string,
        private systemHeartbeat: SystemHeartbeat
    ) {
        super();
        this.url = 'https://api.bybit.com';
        this.bybitRestClientV5 = new RestClientV5({
            key: this.apiKey,
            secret: this.secret,
        });
    }

    public async setLeverageAsync(commonId: string, coin: Coin, leverage: Leverage): Promise<void> {
        const symbol = `${coin}USDT`;
        try {
            await this.bybitRestClientV5.setLeverage({
                buyLeverage: leverage.toString(),
                category: 'linear',
                sellLeverage: leverage.toString(),
                symbol: symbol,
            });
        } catch (error) {
            throw error;
        }
    }

    public async getWalletBalanceAsync(commonId: string): Promise<WalletBalance> {
        try {
            const response = await this.bybitRestClientV5.getWalletBalance({
                accountType: 'UNIFIED',
                coin: USDTCoin,
            });

            const balanceList = response.result?.list;
            if (!balanceList || balanceList.length === 0) {
                throw new Error('Invalid wallet balance response.');
            }

            const wallet = new WalletBalance();
            wallet.availableAmount = parseFloat(balanceList[0].totalAvailableBalance) || 0;
            wallet.totalAmount = parseFloat(balanceList[0].totalEquity) || 0;

            return wallet;
        } catch (error) {
            throw error;
        }
    }

    public async getPositionInfoAsync(commonId: string): Promise<Position[]> {
        try {
            const response = await this.bybitRestClientV5.getPositionInfo({
                category: 'linear',
                settleCoin: USDTCoin,
            });
            
            const list = response.result?.list ?? [];

            const positions = list.map((item) => BybitPositionMapper(item));

            return positions;
        } catch (error) {
            throw error;
        }
    }

    public async getPositionsHistory(commonId: string): Promise<any[]> {
        try {
            const response = await this.bybitRestClientV5.getClosedPnL({
                category: 'linear',
                startTime: Date.now() - 60 * 60000
            });

            const list = response.result?.list ?? [];

            return list;
        } catch (error) {
            throw error;
        }
    }

    public async newOrderAsync(commonId: string, coin: Coin, percentage: Percentage, side: Side, leverage: Leverage): Promise<void> {
        try {
            const [wallet, price] = await Promise.all([this.getWalletBalanceAsync(commonId), this.getPriceAsync(commonId, coin)]);
            
            await this.setLeverageAsync(commonId, coin, leverage);

            const qty = (wallet.availableAmount * ((percentage * leverage) / 100)) / price;

            await this.openPositionAsync(commonId, coin, side, qty);
        } catch (error) {
            throw error;
        }
    }

    public async openPositionAsync(commonId: string, coin: Coin, side: Side, qty: number): Promise<void> {
        try {
            const symbol = `${coin}USDT`;
            await this.submitOrderWithPrecisionAsync(commonId, qty, 3, symbol, side);
        } catch (error) {
            throw error;
        }
    }

    public async getPriceAsync(commonId: string, coin: Coin): Promise<number> {
        try {
            const symbol = `${coin}USDT`;
            const response = await this.bybitRestClientV5.getTickers({
                category: 'linear',
                symbol: symbol,
            });

            const price = parseFloat(response.result?.list?.[0]?.markPrice);
            if (isNaN(price)) {
                throw new Error(`Invalid price received for ${symbol}`);
            }

            return price;
        } catch (error) {
            throw error;
        }
    }

    public closeWholePositionAsync(commonId: string, coin: Coin): Promise<void> {
        return this.closePositionAsync(commonId, coin, undefined);
    }

    public async closePositionAsync(commonId: string, coin: Coin, quantity?: number): Promise<void> {
        const symbol = coin + USDTCoin;

        try {
            const position = (await this.getPositionInfoAsync(commonId)).find((x) => x.symbol === symbol);

            if (position === undefined) {
                return;
            }

            quantity = quantity === undefined ? position.size : quantity;

            await this.openPositionAsync(commonId, coin, position.side === 'Buy' ? 'Sell' : 'Buy', quantity);
        } catch (error) {
            throw error;
        }
    }

    public async setStopLossAsync(commonId: string, coin: Coin, stopLossPrice: number) {
        const symbol = coin + USDTCoin;

        console.log(stopLossPrice);

        try {
            await this.bybitRestClientV5.setTradingStop({
                category: 'linear',
                symbol: symbol,
                stopLoss: stopLossPrice.toString(),
                slTriggerBy: 'MarkPrice',
                positionIdx: 0,
            });
        } catch (error) {
            throw error;
        }        
    }

    private async submitOrderWithPrecisionAsync(commonId: string, qty: number, precision: number, symbol: string, side: Side, retries = 3): Promise<void> {
        const formattedQty = qty.toFixed(precision).replace(/\.?0+$/, '');

        try {
            const response = await this.bybitRestClientV5.submitOrder({
                category: 'linear',
                symbol: symbol,
                side: side,
                orderType: 'Market',
                qty: formattedQty,
            });            

            if (response.retMsg === 'Qty invalid' && precision > 0) {
                if (retries <= 0) {
                    throw new Error(`Failed to submit order after multiple attempts: ${response.retMsg}`);
                }
                return this.submitOrderWithPrecisionAsync(commonId, qty, precision - 1, symbol, side, retries - 1);
            }

            if (response.retCode !== 0 || response.retMsg !== 'OK') {
                throw new Error(response.retMsg);
            }
        } catch (error) {
            throw error;
        }
    }
}
