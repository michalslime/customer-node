import { Injectable } from '@nestjs/common';
import { RestClientV5 } from 'bybit-api';
import { Coin, Leverage, Percentage, Side, USDTCoin } from 'src/models/bybit-investing';
import { Position, PositionMapper } from 'src/models/position';
import { WalletBalance } from 'src/models/wallet';
import { ErrorsService } from './errors.service';

@Injectable()
export class BybitInvestingLocalService {

    constructor(
        private errorsService: ErrorsService
    ) {
    }

    public async setLeverageAsync(coin: Coin, leverage: Leverage): Promise<void> {
        const symbol = `${coin}USDT`;
        try {
            // await this.bybitRestClientV5.setLeverage({
            //     buyLeverage: leverage.toString(),
            //     category: 'linear',
            //     sellLeverage: leverage.toString(),
            //     symbol: symbol,
            // });
        } catch (error) {
            this.errorsService.addError('Error at setLeverageAsync', error, '');
            throw error;
        }
    }

    public async getWalletBalanceAsync(): Promise<WalletBalance> {
        try {
            // const response = await this.bybitRestClientV5.getWalletBalance({
            //     accountType: 'UNIFIED',
            //     coin: USDTCoin,
            // });

            // const balanceList = response.result?.list;
            // if (!balanceList || balanceList.length === 0) {
            //     console.log(JSON.stringify(response));
            //     throw new Error('Invalid wallet balance response.');
            // }

            const wallet = new WalletBalance();
            // wallet.availableAmount = parseFloat(balanceList[0].totalAvailableBalance) || 0;
            // wallet.totalAmount = parseFloat(balanceList[0].totalEquity) || 0;

            return wallet;
        } catch (error) {
            this.errorsService.addError('Error at getWalletBalanceAsync', error, '');
            throw error;
        }
    }

    public async getPositionInfoAsync(): Promise<Position[]> {
        try {
            // const response = await this.bybitRestClientV5.getPositionInfo({
            //     category: 'linear',
            //     settleCoin: USDTCoin,
            // });
            
            // const list = response.result?.list ?? [];

            // const positions = list.map((item) => PositionMapper(item));

            // return positions;

            const mockPosition = new Position();
            mockPosition.coin = 'BTC' as Coin;
            mockPosition.symbol = 'BTCUSDT';
            mockPosition.side = 'Buy';
            mockPosition.takeProfit = 50000;
            mockPosition.stopLoss = 40000;
            mockPosition.price = 45000;
            mockPosition.pnl = 500;
            mockPosition.size = 0.1;
            mockPosition.originalPosition = {} as any;

            return [mockPosition];
        } catch (error) {
            this.errorsService.addError('Error at getPositionInfoAsync', error, '');
            throw error;
        }
    }

    public async newOrderAsync(coin: Coin, percentage: Percentage, side: Side, leverage: Leverage): Promise<void> {
        try {
            const [wallet, price] = await Promise.all([this.getWalletBalanceAsync(), this.getPriceAsync(coin)]);

            await this.setLeverageAsync(coin, leverage);

            const qty = (wallet.availableAmount * ((percentage * leverage) / 100)) / price;

            await this.openPositionAsync(coin, side, qty);
        } catch (error) {
            this.errorsService.addError('Error at newOrderAsync', error, '');
            throw error;
        }
    }

    public async openPositionAsync(coin: Coin, side: Side, qty: number): Promise<void> {
        try {
            const symbol = `${coin}USDT`;
            await this.submitOrderWithPrecisionAsync(qty, 3, symbol, side);
        } catch (error) {
            this.errorsService.addError('Error at openPositionAsync', error, '');
            throw error;
        }
    }

    public async getPriceAsync(coin: Coin): Promise<number> {
        try {
            // const symbol = `${coin}USDT`;
            // const response = await this.bybitRestClientV5.getTickers({
            //     category: 'linear',
            //     symbol: symbol,
            // });

            // const price = parseFloat(response.result?.list?.[0]?.markPrice);
            // if (isNaN(price)) {
            //     throw new Error(`Invalid price received for ${symbol}`);
            // }

            // return price;
            return 1;
        } catch (error) {
            this.errorsService.addError('Error at getPriceAsync', error, '');
            throw error;
        }
    }

    public closeWholePositionAsync(coin: Coin): Promise<void> {
        return this.closePositionAsync(coin, undefined);
    }

    public async closePositionAsync(coin: Coin, quantity?: number): Promise<void> {
        const symbol = coin + USDTCoin;

        try {
            const position = (await this.getPositionInfoAsync()).find((x) => x.symbol === symbol);

            if (position === undefined) {
                return;
            }

            quantity = quantity === undefined ? position.size : quantity;

            await this.openPositionAsync(coin, position.side === 'Buy' ? 'Sell' : 'Buy', quantity);
        } catch (error) {
            this.errorsService.addError('Error at closePositionAsync', error, '');
            throw error;
        }
    }

    public async setStopLossAsync(coin: Coin, stopLossPrice: number): Promise<void> {
        const symbol = coin + USDTCoin;

        try {
            // await this.bybitRestClientV5.setTradingStop({
            //     category: 'linear',
            //     symbol: symbol,
            //     stopLoss: stopLossPrice.toString(),
            //     slTriggerBy: 'MarkPrice',
            //     positionIdx: 0,
            // });
        } catch (error) {
            this.errorsService.addError('Error at setting stop loss', error, '');
            throw error;
        }        
    }

    private async submitOrderWithPrecisionAsync(qty: number, precision: number, symbol: string, side: Side, retries = 3): Promise<void> {
        console.log(qty);
        const formattedQty = qty.toFixed(precision).replace(/\.?0+$/, '');

        try {
            // const response = await this.bybitRestClientV5.submitOrder({
            //     category: 'linear',
            //     symbol: symbol,
            //     side: side,
            //     orderType: 'Market',
            //     qty: formattedQty,
            // });            

            // if (response.retMsg === 'Qty invalid' && precision > 0) {
            //     if (retries <= 0) {
            //         throw new Error(`Failed to submit order after multiple attempts: ${response.retMsg}`);
            //     }
            //     return this.submitOrderWithPrecisionAsync(qty, precision - 1, symbol, side, retries - 1);
            // }

            // if (response.retCode !== 0 || response.retMsg !== 'OK') {
            //     throw new Error(response.retMsg);
            // 
        } catch (error) {
            this.errorsService.addError(`Error at submitting order (Symbol: ${symbol}, Side: ${side}, Qty: ${formattedQty}):`, error, '');
            throw error;
        }
    }
}
