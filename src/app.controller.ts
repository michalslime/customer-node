import { Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ActivePosition } from './models/active-position';
import type { Coin } from './models/bybit-investing';
import { BybitInvestingService } from './services/bybit-investing.service';
import { ErrorsService } from './services/errors.service';
import { InvestingService } from './services/investing.service';
import { ErrorCodes } from './others/error-codes.enum';
import { CommandsService } from './services/commands.service';

@Controller()
export class AppController {
    constructor(private bybitInvestingService: BybitInvestingService,
        private investingService: InvestingService,
        private errorsService: ErrorsService,
        private commandsService: CommandsService
    ) { }

    @Post('ping')
    async ping(): Promise<void> {
        try {
            const commands = await this.commandsService.getCommandsAsync();

            await this.commandsService.processFetchedCommandsAsync(commands);

            return;
        } catch (error: any) {
            this.handleError(error);
        }
    }

    @Get('price/:coin')
    async getPrice(@Param('coin') coin: Coin): Promise<number> {
        console.log(coin);
        try {
            const price = await this.bybitInvestingService.getPriceAsync(coin);
            return price || 0;
        } catch (error: any) {
            this.handleError(error);
        }
    }

    @Get('wallet-balance/total')
    async getWalletTotalBalance(): Promise<number> {
        try {
            const wallet = await this.bybitInvestingService.getWalletBalanceAsync();
            return wallet.totalAmount;
        } catch (error: any) {
            this.handleError(error);
        }
    }

    @Get('wallet-balance/available')
    async getWalletAvailableBalance(): Promise<number> {
        try {
            const wallet = await this.bybitInvestingService.getWalletBalanceAsync();
            return wallet.availableAmount;
        } catch (error: any) {
            this.handleError(error);
        }
    }

    @Get('positions')
    async getOpenPositions(): Promise<ActivePosition[]> {
        try {
            const positions = await this.investingService.getActivePositionsAsync();
            return positions
        } catch (error: any) {
            this.handleError(error);
        }
    }

    private handleError(error: any): never {
        this.errorsService.addError(error.message, error);

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
        } else
            {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
