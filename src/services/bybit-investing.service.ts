import { Injectable } from '@nestjs/common';
import { RestClientV5 } from 'bybit-api';
import { Coin, Leverage, Percentage, Side, USDTCoin } from 'src/models/bybit-investing';
import { Position, PositionMapper } from 'src/models/position';
import { WalletBalance } from 'src/models/wallet';
import { ErrorsService } from './errors.service';
import { SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';

@Injectable()
export class BybitInvestingService {
    private readonly url: string;
    private readonly bybitRestClientV5: RestClientV5;

    constructor(
        private readonly apiKey: string,
        private readonly secret: string,
        private errorsService: ErrorsService,
        private systemHeartbeat: SystemHeartbeat
    ) {
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
            this.errorsService.addError('Error at setLeverageAsync', error, commonId);
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
            this.errorsService.addError('Error at getWalletBalanceAsync', error, commonId);
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

            const positions = list.map((item) => PositionMapper(item));

            return positions;
        } catch (error) {
            this.errorsService.addError('Error at getPositionInfoAsync', error, commonId);
            throw error;
        }
    }

    public async newOrderAsync(commonId: string, coin: Coin, percentage: Percentage, side: Side, leverage: Leverage): Promise<void> {
        try {
            const [wallet, price] = await Promise.all([this.getWalletBalanceAsync(commonId), this.getPriceAsync(commonId, coin)]);

            this.systemHeartbeat.logInfo(commonId, 'Wallet balance and price retrieved', {
                wallet,
                price
            });

            await this.setLeverageAsync(commonId, coin, leverage);

            const qty = (wallet.availableAmount * ((percentage * leverage) / 100)) / price;

            await this.openPositionAsync(commonId, coin, side, qty);
        } catch (error) {
            this.errorsService.addError('Error at newOrderAsync', error, commonId);
            throw error;
        }
    }

    public async openPositionAsync(commonId: string, coin: Coin, side: Side, qty: number): Promise<void> {
        try {
            const symbol = `${coin}USDT`;
            await this.submitOrderWithPrecisionAsync(commonId, qty, 3, symbol, side);
        } catch (error) {
            this.errorsService.addError('Error at openPositionAsync', error, commonId);
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
            this.errorsService.addError('Error at getPriceAsync', error, commonId);
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
            this.errorsService.addError('Error at closePositionAsync', error, commonId);
            throw error;
        }
    }

    public async setStopLossAsync(commonId: string, coin: Coin, stopLossPrice: number) {
        const symbol = coin + USDTCoin;

        try {
            await this.bybitRestClientV5.setTradingStop({
                category: 'linear',
                symbol: symbol,
                stopLoss: stopLossPrice.toString(),
                slTriggerBy: 'MarkPrice',
                positionIdx: 0,
            });
        } catch (error) {
            this.errorsService.addError('Error at setting stop loss', error, commonId);
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
            this.errorsService.addError(`Error at submitting order (Symbol: ${symbol}, Side: ${side}, Qty: ${formattedQty}):`, error, commonId);
            throw error;
        }
    }
}
