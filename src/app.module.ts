import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ErrorsService } from './services/errors.service';
import { BybitInvestingService } from './services/bybit-investing.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestingService } from './services/investing.service';
import { CommandsService } from './npm-package-candidate/commands.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { HeartbeatModule } from './npm-package-candidate/heartbeat.module';
import { SystemHeartbeat } from './npm-package-candidate/system-heartbeat';
import { OctopusService } from './services/octopus.service';
import { trimTrailingSlash, hashTo6Upper } from './npm-package-candidate/utils/utils';
import { EXCHANGE_SERVICE } from './services/exchange.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV}`,
        }),
        HttpModule.register({
            timeout: 10000,
        }),
        HeartbeatModule.forRoot({
            applicationName: 'customer-node',
            machineUrl: trimTrailingSlash(process.env.MY_PUBLIC_URL || ''),
            workspace: process.env.WORKSPACE || 'NO_WORKSPACE'
        }),
    ],
    controllers: [AppController],
    providers: [
        ErrorsService,
        {
            provide: EXCHANGE_SERVICE,
            useFactory: (configService: ConfigService, errorsService: ErrorsService, systemHeartbeat: SystemHeartbeat) => {
                // if (process.env.NODE_ENV === 'development') {
                //     return new BybitInvestingLocalService(errorsService);
                // }

                let apiKey = configService.get<string>('EXCHANGE_API_KEY') ?? '';
                let secret = configService.get<string>('EXCHANGE_API_SECRET') ?? '';

                switch (process.env.EXCHANG) {
                    case 'bybit':
                        return new BybitInvestingService(apiKey, secret, errorsService, systemHeartbeat);
                    default:
                        return new BybitInvestingService(apiKey, secret, errorsService, systemHeartbeat);
                }
            },
            inject: [ConfigService, ErrorsService, SystemHeartbeat]
        },
        InvestingService,
        {
            provide: CommandsService,
            useFactory: (configService: ConfigService, httpService: HttpService, systemHeartbeat: SystemHeartbeat) => {

                let octopusUrl = trimTrailingSlash(configService.get<string>('OCTOPUS_URL') ?? '');

                const machineId = hashTo6Upper(octopusUrl);

                return new CommandsService('Octopus', machineId, `${octopusUrl}/customer/customer-commands`, httpService, systemHeartbeat);
            },
            inject: [ConfigService, HttpService, SystemHeartbeat]
        },
        OctopusService

    ],
    exports: [EXCHANGE_SERVICE]
})
export class AppModule {
}

