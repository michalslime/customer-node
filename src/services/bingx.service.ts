import { Injectable } from '@nestjs/common';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { ExchangeService } from './exchange.service';
import { Position } from 'src/models/position';
import { WalletBalance } from 'src/models/wallet';

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

            // podpis
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

    async setLeverageAsync(): Promise<void> {
        throw new Error('setLeverageAsync is not implemented for BingX yet.');
    }
    async getPositionInfoAsync(): Promise<Position[]> {
        throw new Error('getPositionInfoAsync is not implemented for BingX yet.');
    }
    async newOrderAsync(): Promise<void> {
        throw new Error('newOrderAsync is not implemented for BingX yet.');
    }
    async openPositionAsync(): Promise<void> {
        throw new Error('openPositionAsync is not implemented for BingX yet.');
    }
    async getPriceAsync(): Promise<number> {
        throw new Error('getPriceAsync is not implemented for BingX yet.');
    }
    async closeWholePositionAsync(): Promise<void> {
        throw new Error('closeWholePositionAsync is not implemented for BingX yet.');
    }
    async closePositionAsync(): Promise<void> {
        throw new Error('closePositionAsync is not implemented for BingX yet.');
    }
    async setStopLossAsync(): Promise<void> {
        throw new Error('setStopLossAsync is not implemented for BingX yet.');
    }
}
