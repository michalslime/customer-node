import { Injectable } from '@nestjs/common';
import { OrderParamsV5, RestClientV5 } from 'bybit-api';
import { ExchangeService } from '../exchange.service';
import { SystemHeartbeat } from 'src/npm-package-candidate/system-heartbeat';
import { Coin, Leverage, USDTCoin, Percentage, Side } from '../../npm-package-base/types';
import { BybitPositionMapper } from './bybit-mapper';
import { Position, WalletBalance } from '../../npm-package-base/models';

@Injectable()
export class BybitInvestingService extends ExchangeService {

    private readonly url: string;
    private readonly bybitRestClientV5: RestClientV5;

    private instrumentDetailsMap = new Map<string, string>();

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

            const properSize = await this.getProperOrderSize(commonId, coin, qty);

            await this.openPositionAsync(commonId, coin, side, properSize);
        } catch (error) {
            throw error;
        }
    }

    public async getProperOrderSize(commonId: string, coin: Coin, qty: number): Promise<string> {
        try {
            const symbol = `${coin}USDT`;

            const formatBybitQty = (value: number, step: string): string => {
                const stepNum = parseFloat(step);
                const precision = step.includes('.') ? step.split('.')[1].length : 0;

                const calculatedValue = Math.floor(value / stepNum) * stepNum;

                return parseFloat(calculatedValue.toFixed(precision)).toString();
            };

            if (!this.instrumentDetailsMap.has(symbol)) {
                const instrumentInfo = await this.bybitRestClientV5.getInstrumentsInfo({
                    category: 'linear',
                    symbol,
                });

                const details = instrumentInfo.result.list[0];
                const qtyStep = details.lotSizeFilter.qtyStep;

                this.systemHeartbeat.logWarn(commonId, `Instrument info for ${coin}`, details);

                this.instrumentDetailsMap.set(symbol, qtyStep);
            }

            const step = this.instrumentDetailsMap.get(symbol) ?? '1';

            return formatBybitQty(qty, step);
        } catch (error) {
            throw error;
        }
    }

    public async openPositionAsync(commonId: string, coin: Coin, side: Side, qty: string): Promise<void> {
        try {
            const symbol = `${coin}USDT`;

            const payload: OrderParamsV5 = {
                category: 'linear',
                symbol: symbol,
                side: side,
                orderType: 'Market',
                qty,
            };

            this.systemHeartbeat.logWarn(commonId, `Placing order for ${coin}`, payload);

            const response = await this.bybitRestClientV5.submitOrder(payload);

            if (response.retMsg === 'Qty invalid') {
                this.systemHeartbeat.logError(commonId, `Qty invalid error: ${response.retMsg}`, {
                    qty,
                    symbol,
                    side
                });
                throw new Error(`Failed to submit order: ${response.retMsg}`);
            }

            if (response.retCode !== 0 || response.retMsg !== 'OK') {
                this.systemHeartbeat.logError(commonId, `Failed to submit order: ${response.retMsg}`, {
                    qty,
                    symbol,
                    side
                });
                throw new Error(response.retMsg);
            }
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

    public async closePositionAsync(commonId: string, coin: Coin, quantity?: string): Promise<void> {
        const symbol = coin + USDTCoin;

        try {
            const position = (await this.getPositionInfoAsync(commonId)).find((x) => x.symbol === symbol);

            if (position === undefined) {
                return;
            }

            quantity = quantity === undefined ? position.size.toString() : quantity;

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
}
