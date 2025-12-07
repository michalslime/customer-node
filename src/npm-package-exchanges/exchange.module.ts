import { ConfigService } from "@nestjs/config";
import { SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";
import { BingxService } from "./bingx.service";
import { BybitInvestingService } from "./bybit-investing.service";
import { EXCHANGE_SERVICE } from "./exchange.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [
    ],
    controllers: [],
    providers: [
        {
            provide: EXCHANGE_SERVICE,
            useFactory: (configService: ConfigService, systemHeartbeat: SystemHeartbeat) => {
                // if (process.env.NODE_ENV === 'development') {
                //     return new BybitInvestingLocalService(errorsService);
                // }

                let apiKey = configService.get<string>('EXCHANGE_API_KEY') ?? '';
                let secret = configService.get<string>('EXCHANGE_API_SECRET') ?? '';

                switch (process.env.EXCHANGE) {
                    case 'bingx':
                        return new BingxService(apiKey, secret);
                    case 'bybit':
                        return new BybitInvestingService(apiKey, secret, systemHeartbeat);
                    default:
                        return new BybitInvestingService(apiKey, secret, systemHeartbeat);
                }
            },
            inject: [ConfigService, SystemHeartbeat]
        },

    ],
    exports: [EXCHANGE_SERVICE]
})
export class ExchangeModule {
}