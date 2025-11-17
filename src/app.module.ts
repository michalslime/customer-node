import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ErrorsService } from './services/errors.service';
import { BybitInvestingService } from './services/bybit-investing.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestingService } from './services/investing.service';
import { CommandsService } from './npm-package-candidate/commands.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { BybitInvestingLocalService } from './services/bybit-investing-local.service';
import { HeartbeatModule } from './npm-package-candidate/heartbeat.module';
import { SystemHeartbeat } from './npm-package-candidate/system-heartbeat';

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
            machineUrl: process.env.MY_PUBLIC_URL || ''
        }),
    ],
    controllers: [AppController],
    providers: [
        ErrorsService,
        {
            provide: BybitInvestingService,
            useFactory: (configService: ConfigService, errorsService: ErrorsService) => {
                if (process.env.NODE_ENV === 'development') {
                    return new BybitInvestingLocalService(errorsService);
                }
                
                let apiKey = configService.get<string>('BYBIT_INVESTING_API_KEY') ?? '';
                let secret = configService.get<string>('BYBIT_INVESTING_API_SECRET') ?? '';

                return new BybitInvestingService(apiKey, secret, errorsService);
            },
            inject: [ConfigService, ErrorsService]
        },
        InvestingService,
        {
            provide: CommandsService,
            useFactory: (configService: ConfigService, httpService: HttpService, systemHeartbeat: SystemHeartbeat) => {
  
                let octopusUrl = configService.get<string>('OCTOPUS_URL') ?? '';

                return new CommandsService('Octopus', `${octopusUrl}/investing/customer-commands`, httpService, systemHeartbeat);
            },
            inject: [ConfigService, HttpService, SystemHeartbeat]
        },
        
    ],
})
export class AppModule { 
}

