import { Controller, Get, HttpException, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { Coin } from './models/bybit-investing';
import { BybitInvestingService } from './services/bybit-investing.service';
import { ErrorsService } from './services/errors.service';
import { InvestingService } from './services/investing.service';
import { ErrorCodes } from './others/error-codes.enum';
import { CommandsService } from './services/commands.service';
import { Position } from './models/position';
import type { Request } from 'express';

@Controller()
export class AppController {
    constructor(private bybitInvestingService: BybitInvestingService,
        private investingService: InvestingService,
        private errorsService: ErrorsService,
        private commandsService: CommandsService
    ) { }

    @Post('ping')
    async handlePing(@Req() request: Request): Promise<void> {
        try {
            const commands = await this.commandsService.getCommandsAsync(request.commonId);

            await this.commandsService.processFetchedCommandsAsync(commands, request.commonId);

            return;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('price/:coin')
    async getPrice(@Req() request: Request, @Param('coin') coin: Coin): Promise<number> {
        console.log(coin);
        try {
            const price = await this.bybitInvestingService.getPriceAsync(request.commonId, coin);
            return price || 0;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('wallet-balance/total')
    async getWalletTotalBalance(@Req() request: Request): Promise<number> {
        try {
            const wallet = await this.bybitInvestingService.getWalletBalanceAsync(request.commonId);
            return wallet.totalAmount;
        } catch (error: any) {
            this.handleError(error, request.commonId);
        }
    }

    @Get('wallet-balance/available')
    async getWalletAvailableBalance(@Req() request: Request): Promise<number> {
        try {
            const wallet = await this.bybitInvestingService.getWalletBalanceAsync(request.commonId);
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
        } else
            {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
