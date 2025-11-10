import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ErrorsService } from './services/errors.service';
import { BybitInvestingService } from './services/bybit-investing.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestingService } from './services/investing.service';
import { CommandsService } from './services/commands.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        HttpModule.register({
            timeout: 10000,
        }),
    ],
    controllers: [AppController],
    providers: [
        ErrorsService,
        {
            provide: BybitInvestingService,
            useFactory: (configService: ConfigService, errorsService: ErrorsService) => {
                let apiKey = configService.get<string>('BYBIT_INVESTING_API_KEY') ?? '';
                let secret = configService.get<string>('BYBIT_INVESTING_API_SECRET') ?? '';

                return new BybitInvestingService(apiKey, secret, errorsService);
            },
            inject: [ConfigService, ErrorsService]
        },
        InvestingService,
        CommandsService
    ],
})
export class AppModule { }
