import { PositionSideV5, positionTpSlModeEnum, PositionV5 } from "bybit-api";
import { Coin, Side, USDTCoin } from "./bybit-investing";

export class Position {
    coin: Coin;
    symbol: string;
    side: Side;
    takeProfit?: number;
    stopLoss?: number;
    price: number;
    pnl: number;
    size: number;
    originalPosition: PositionV5
}

export function PositionMapper(positionResponse: PositionV5) {
    const position = new Position();

    try {
        position.coin = positionResponse.symbol.replace(USDTCoin, '') as Coin;
        position.symbol = positionResponse.symbol;
        position.side = mapBybitSide(positionResponse.side);
        position.takeProfit = positionResponse.takeProfit === '' || positionResponse.takeProfit === undefined || positionResponse.takeProfit === null ? undefined : parseFloat(positionResponse.takeProfit);
        position.stopLoss = positionResponse.stopLoss === '' || positionResponse.stopLoss === undefined || positionResponse.takeProfit === null ? undefined : parseFloat(positionResponse.stopLoss);
        position.price = parseFloat(positionResponse.markPrice);
        position.pnl = parseFloat(positionResponse.unrealisedPnl);
        position.size = parseFloat(positionResponse.size);
        position.originalPosition = positionResponse;
    } catch (err) {
        console.error(err);
    }
    
    return position;
}

function mapBybitSide(side: PositionSideV5): Side {
    if (side === "Buy" || side === "Sell") {
        return side;
    }
    throw new Error(`Invalid side value received: ${side}`);
}