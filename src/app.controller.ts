import { Controller, Get, HttpException, HttpStatus, Inject, Param, Post, Req } from '@nestjs/common';
import type { Coin } from './models/bybit-investing';
import { ErrorsService } from './services/errors.service';
import { InvestingService } from './services/investing.service';
import { ErrorCodes } from './others/error-codes.enum';
import { CommandsService } from './npm-package-candidate/commands.service';
import { Position } from './models/position';
import type { Request } from 'express';
import { OctopusService } from './services/octopus.service';
import { SystemHeartbeat } from './npm-package-candidate/system-heartbeat';
import { EXCHANGE_SERVICE, ExchangeService } from './npm-package-exchanges/exchange.service';

@Controller()
export class AppController {
    constructor(
        @Inject(EXCHANGE_SERVICE)
        private exchangeService: ExchangeService,
        private investingService: InvestingService,
        private errorsService: ErrorsService,
        private commandsService: CommandsService,
        private octopusService: OctopusService,
        private readonly systemHeartbeat: SystemHeartbeat
    ) { }

    @Post('ping')
    async handlePing(@Req() request: Request): Promise<void> {
        try {
            await this.investingService.fetchAndProcessCommands(request.commonId, this.commandsService);

            return;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('price/:coin')
    async getPrice(@Req() request: Request, @Param('coin') coin: Coin): Promise<number> {
        console.log(coin);
        try {
            const price = await this.exchangeService.getPriceAsync(request.commonId, coin);
            return price || 0;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('wallet-balance/total')
    async getWalletTotalBalance(@Req() request: Request): Promise<number> {
        try {
            console.log('Getting total wallet balance');
            const wallet = await this.exchangeService.getWalletBalanceAsync(request.commonId);
            return wallet.totalAmount;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('wallet-balance/available')
    async getWalletAvailableBalance(@Req() request: Request): Promise<number> {
        try {
            const wallet = await this.exchangeService.getWalletBalanceAsync(request.commonId);
            return wallet.availableAmount;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('positions')
    async getOpenPositions(@Req() request: Request): Promise<Position[]> {
        try {
            const positions = await this.investingService.getPositionsAsync();
            return positions
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Post('wake-up')
    async wakeUp(@Req() request: Request): Promise<void> {
        try {
            await this.octopusService.registerMe(request.commonId);

            return;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('my-machine-id')
    async myMachineId(@Req() request: Request): Promise<string> {
        try {
            return this.systemHeartbeat.machineId;
        } catch (err: any) {
            this.handleError(err, request.commonId);
        }
    }

    private handleError(error: any, commonId: string): never {
        this.errorsService.addError(error.message, error, commonId);

        if (error.message === ErrorCodes.TOO_MANY_REQUESTS) {
            throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
        } else if (error.message === ErrorCodes.INSUFFICIENT_FUNDS) {
            throw new HttpException(error.message, HttpStatus.PAYMENT_REQUIRED);
        } else if (error.message === ErrorCodes.PENDING_DEFERRED_REFILL) {
            throw new HttpException(error.message, HttpStatus.CONFLICT);
        } else if (error.message === ErrorCodes.TOO_BIG_REFILL) {
            throw new HttpException(error.message, HttpStatus.CONFLICT);
        } else if (error.message === ErrorCodes.DEPO_EXCEEDED) {
            throw new HttpException(error.message, HttpStatus.CONFLICT);
        } else {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}


