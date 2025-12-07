import { Controller, Get, Inject } from "@nestjs/common";
import { EXCHANGE_SERVICE, ExchangeService } from "./exchange.service";

@Controller('test')
export class TestController {

    constructor(
        @Inject(EXCHANGE_SERVICE)
        private readonly exchangeService: ExchangeService
    ) { }

    @Get('price')
    async getPrice(): Promise<number> {
        const price = await this.exchangeService.getPriceAsync('test-common-id', 'BTC');

        return price;
    }

    @Get('open-position')
    async getOpenPosition(): Promise<void> {
        await this.exchangeService.newOrderAsync('test-common-id', 'BTC', 10, 'Buy', 15);
    }
}