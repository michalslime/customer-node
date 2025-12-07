import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ErrorsService } from './services/errors.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestingService } from './services/investing.service';
import { CommandsService } from './npm-package-candidate/commands.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { HeartbeatModule } from './npm-package-candidate/heartbeat.module';
import { SystemHeartbeat } from './npm-package-candidate/system-heartbeat';
import { OctopusService } from './services/octopus.service';
import { trimTrailingSlash, hashTo6Upper } from './npm-package-candidate/utils/utils';
import { ExchangeModule } from './npm-package-exchanges/exchange.module';

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
        ExchangeModule
    ],
    controllers: [AppController],
    providers: [
        ErrorsService,
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

    ]
})
export class AppModule {
}

