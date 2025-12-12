import { Injectable } from '@nestjs/common';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { ExchangeService } from '../exchange.service';
import { WalletBalance } from 'src/models/wallet';
import { Coin, Leverage, Percentage, Side, USDTCoin } from '../../npm-package-base/types';
import { Position } from '../../npm-package-base/models';

@Injectable()
export class BingxService extends ExchangeService {
    
    private readonly HOST = 'open-api.bingx.com';
    private readonly PROTOCOL = 'https';

    constructor(
        private readonly apiKey: string,
        private readonly apiSecret: string,
    ) {
        super();
    }

    public async getWalletBalanceAsync(commonId: string): Promise<WalletBalance> {
        try {
            const path = '/openApi/swap/v3/user/balance';
            const method = 'GET';
            const timestamp = Date.now();

            const payload = {}; // brak parametrów

            const params = this.buildParameters(payload, timestamp, false);
            const paramsEncoded = this.buildParameters(payload, timestamp, true);

            const signature = CryptoJS.enc.Hex.stringify(
                CryptoJS.HmacSHA256(params, this.apiSecret),
            );

            const url =
                `${this.PROTOCOL}://${this.HOST}${path}?` +
                `${paramsEncoded}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: {
                    'X-BX-APIKEY': this.apiKey,
                },
            });

            const list = response.data?.data;

            if (!Array.isArray(list) || list.length === 0) {
                throw new Error('Invalid wallet response from BingX.');
            }

            const usdt = list.find((x) => x.asset === 'USDT');

            if (!usdt) {
                throw new Error('USDT asset not found in BingX wallet.');
            }

            const wallet = new WalletBalance();
            wallet.availableAmount = parseFloat(usdt.availableMargin ?? '0');
            wallet.totalAmount = parseFloat(usdt.equity ?? '0');

            return wallet;
        } catch (error) {
            console.error(`Error in BingxService.getWalletBalanceAsync [${commonId}]`, error);
            throw error;
        }
    }

    async setLeverageAsync(commonId: string, coin: Coin, leverage: Leverage): Promise<void> {
        try {
            const path = '/openApi/swap/v2/trade/leverage';
            const method = 'POST';
            const timestamp = Date.now();

            const symbol = `${coin.replace('USDT', '')}-USDT`;

            const payload = {
                leverage: leverage.toString(),
                side: 'BOTH',
                symbol: symbol
            };

            const params = this.buildParameters(payload, timestamp, false);
            const paramsEncoded = this.buildParameters(payload, timestamp, true);

            const signature = CryptoJS.enc.Hex.stringify(
                CryptoJS.HmacSHA256(params, this.apiSecret)
            );

            const url =
                `${this.PROTOCOL}://${this.HOST}${path}?` +
                `${paramsEncoded}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: {
                    'X-BX-APIKEY': this.apiKey,
                },
            });

            if (response.data.code !== 0) {
                throw new Error(`BingX leverage error: ${response.data.msg}`);
            }

        } catch (error) {
            console.error(`Error in BingxService.setLeverageAsync [${commonId}]`, error);
            throw error;
        }
    }

    async getPositionInfoAsync(commonId: string): Promise<Position[]> {
        try {
            const path = '/openApi/swap/v2/user/positions';
            const method = 'GET';
            const timestamp = Date.now();

            const payload = {};

            const params = this.buildParameters(payload, timestamp, false);
            const paramsEncoded = this.buildParameters(payload, timestamp, true);

            const signature = CryptoJS.enc.Hex.stringify(
                CryptoJS.HmacSHA256(params, this.apiSecret)
            );

            const url =
                `${this.PROTOCOL}://${this.HOST}${path}?` +
                `${paramsEncoded}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: {
                    'X-BX-APIKEY': this.apiKey,
                },
            });

            if (response.data.code !== 0) {
                throw new Error(`BingX getPositionInfo error: ${response.data.msg}`);
            }

            const data = response.data.data;

            if (!Array.isArray(data)) {
                return [];
            }

            const positions: Position[] = data.map((p: any) => positionMapper(p));

            return positions;

        } catch (error) {
            console.error(`Error in BingxService.getPositionInfoAsync [${commonId}]`, error);
            throw error;
        }
    }

    async getPositionsHistory(commonId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async newOrderAsync(commonId: string, coin: Coin, percentage: Percentage, side: Side, leverage: Leverage): Promise<void> {
        try {
            const [wallet, price] = await Promise.all([this.getWalletBalanceAsync(commonId), this.getPriceAsync(commonId, coin)]);

            await this.setDualPositionMode(false);
            await this.setLeverageAsync(commonId, coin, leverage);
            
            const qty = (wallet.availableAmount * ((percentage * leverage) / 100)) / price;

            await this.openPositionAsync(commonId, coin, side, qty);
        } catch (error) {
            throw error;
        }
    }

    async openPositionAsync(commonId: string, coin: Coin, side: Side, qty: number): Promise<void> {
        try {
            const path = '/openApi/swap/v2/trade/order';
            const method = 'POST';

            const symbol = `${coin.replace('USDT', '')}-USDT`;

            const isBuy = side === 'Buy';

            const payload = {
                symbol: symbol,
                side: isBuy ? 'BUY' : 'SELL',
                positionSide: 'BOTH',
                type: 'MARKET',
                quantity: qty,
            };

            const timestamp = Date.now();
            const params = this.buildParameters(payload, timestamp, false);   // do podpisu
            const paramsEncoded = this.buildParameters(payload, timestamp, true); // do URL

            const signature = CryptoJS.enc.Hex.stringify(
                CryptoJS.HmacSHA256(params, this.apiSecret)
            );

            const url =
                `${this.PROTOCOL}://${this.HOST}${path}?` +
                `${paramsEncoded}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: { 'X-BX-APIKEY': this.apiKey },
            });

            const raw = response.data;

            if (raw.code !== 0) {
                throw new Error(`BingX openPosition error: ${raw.msg}`);
            }

            return;

        } catch (error) {
            console.error('Error in openPositionAsync:', error);
            throw error;
        }
    }

    async getPriceAsync(commonId: string, coin: Coin): Promise<number> {
        try {
            const path = '/openApi/swap/v1/ticker/price';
            const method = 'GET';

            const symbol = `${coin.replace('USDT', '')}-USDT`;

            const payload = {
                symbol: symbol,
            };

            const timestamp = Date.now();

            const params = this.buildParameters(payload, timestamp, false);   // bez encodowania
            const paramsEncoded = this.buildParameters(payload, timestamp, true); // urlencode

            const signature = CryptoJS.enc.Hex.stringify(
                CryptoJS.HmacSHA256(params, this.apiSecret)
            );

            const url =
                `${this.PROTOCOL}://${this.HOST}${path}?` +
                `${paramsEncoded}&signature=${signature}`;

            const response = await axios({
                method,
                url,
                headers: {
                    'X-BX-APIKEY': this.apiKey,
                },
            });

            if (response.data.code !== 0) {
                throw new Error(`BingX getPrice error: ${response.data.msg}`);
            }

            const result = response.data.data;

            if (!result || !result.price) {
                throw new Error(`Invalid price response for ${symbol}`);
            }

            const price = parseFloat(result.price);

            if (isNaN(price)) {
                throw new Error(`Price returned NaN for ${symbol}`);
            }

            return price;

        } catch (error) {
            console.error('Error in getPriceAsync:', error);
            throw error;
        }
    }

    async closeWholePositionAsync(commonId: string, coin: Coin): Promise<void> {
        return this.closePositionAsync(commonId, coin, undefined);
    }

    async closePositionAsync(commonId: string, coin: Coin, quantity?: number): Promise<void> {
        const symbol = coin + '-' + USDTCoin;

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

    async setStopLossAsync(commonId: string, coin: Coin, stopLossPrice: number): Promise<void> {
        const symbol = `${coin}-USDT`;

        const positions = await this.getPositionInfoAsync(commonId);
        const pos = positions.find(p => p.symbol === symbol);

        if (!pos) {
            throw new Error(`No open position found for ${symbol}.`);
        }

        const positionSide = "BOTH";
        const side = pos.side === 'Buy' ? 'SELL' : 'BUY'; // SL logic

        const payload: Record<string, any> = {
            symbol,
            side,
            positionSide,
            type: 'STOP_MARKET',
            stopPrice: stopLossPrice.toString(),
            quantity: pos.size.toString(),
        };

        console.log(payload.stopPrice);

        const timestamp = Date.now();

        const params = Object.entries(payload)
            .map(([k, v]) => `${k}=${v}`)
            .join('&') + `&timestamp=${timestamp}`;

        const paramsEncoded = Object.entries(payload)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&') + `&timestamp=${timestamp}`;

        const sign = CryptoJS.enc.Hex.stringify(
            CryptoJS.HmacSHA256(params, this.apiSecret)
        );

        const url = `https://open-api.bingx.com/openApi/swap/v2/trade/order?${paramsEncoded}&signature=${sign}`;

        const config = {
            method: 'POST',
            url,
            headers: {
                'X-BX-APIKEY': this.apiKey,
            },
            transformResponse: (resp: any) => {
                return resp;
            }
        };

        const resp = await axios(config);

        if (resp.status !== 200) {
            throw new Error(`BingX SL failed: ${resp.status}`);
        }
    }

    private async setDualPositionMode(dual: boolean): Promise<void> {
        const path = "/openApi/swap/v1/positionSide/dual";
        const method = "POST";

        const payload: Record<string, any> = {
            dualSidePosition: dual ? "true" : "false",
        };

        const timestamp = Date.now();

        const params = Object.entries(payload)
            .map(([k, v]) => `${k}=${v}`)
            .join("&") + `&timestamp=${timestamp}`;

        const paramsEncoded = Object.entries(payload)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join("&") + `&timestamp=${timestamp}`;

        const sign = CryptoJS.enc.Hex.stringify(
            CryptoJS.HmacSHA256(params, this.apiSecret)
        );

        const url =
            `https://open-api.bingx.com` +
            `${path}?${paramsEncoded}&signature=${sign}`;

        const config = {
            method,
            url,
            headers: {
                "X-BX-APIKEY": this.apiKey,
            },
            transformResponse: (resp: any) => {
                // big-int debug (zalecane przez BingX)
                return resp;
            },
        };

        const resp = await axios(config);

        if (resp.status !== 200) {
            throw new Error(`Failed to set dual mode: ${resp.status}`);
        }
    }

    private buildParameters(payload: any, timestamp: number, urlEncode = false): string {
        let params = '';

        for (const key in payload) {
            const value = payload[key];
            if (urlEncode) {
                params += `${key}=${encodeURIComponent(value)}&`;
            } else {
                params += `${key}=${value}&`;
            }
        }

        if (params) {
            params = params.slice(0, -1);
            params += `&timestamp=${timestamp}`;
        } else {
            params = `timestamp=${timestamp}`;
        }

        return params;
    }
}

function positionMapper(positionResponse: any): Position {
    const position = new Position();

    try {
        position.symbol = positionResponse.symbol;
        position.coin = positionResponse.symbol.replace('-USDT', '') + 'USDT' as Coin;
        position.side = mapBingxSide(positionResponse.positionSide);
        position.takeProfit = undefined;
        position.stopLoss = undefined;
        position.price = parseFloat(positionResponse.avgPrice);
        position.pnl = parseFloat(positionResponse.unrealizedProfit);
        position.size = parseFloat(positionResponse.positionAmt);
        position.originalPosition = positionResponse;

    } catch (err) {
        console.error('Error mapping BingX position:', err);
    }

    return position;
}

function mapBingxSide(side: string): Side {
    if (side.toLocaleUpperCase() === "LONG") {
        return 'Buy';
    } else if (side.toLocaleUpperCase() === "SHORT") {
        return 'Sell';
    }

    throw new Error(`Invalid side value received: ${side}`);
}