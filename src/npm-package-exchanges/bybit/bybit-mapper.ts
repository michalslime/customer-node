import { PositionSideV5, PositionV5 } from "bybit-api";
import { USDTCoin, Coin, Side } from "../../npm-package-base/types";
import { Position } from "../../npm-package-base/models";

export function BybitPositionMapper(positionResponse: PositionV5) {
    const position = new Position();

    try {
        position.coin = positionResponse.symbol.replace(USDTCoin, '') as Coin;
        position.symbol = positionResponse.symbol;
        position.side = mapBybitSide(positionResponse.side);
        position.takeProfit = positionResponse.takeProfit === '' || positionResponse.takeProfit === undefined || positionResponse.takeProfit === null ? undefined : parseFloat(positionResponse.takeProfit);
        position.stopLoss = positionResponse.stopLoss === '' || positionResponse.stopLoss === undefined || positionResponse.takeProfit === null ? undefined : parseFloat(positionResponse.stopLoss);
        position.price = parseFloat(positionResponse.markPrice);
        position.avgPrice = parseFloat(positionResponse.avgPrice);
        position.pnl = parseFloat(positionResponse.unrealisedPnl);
        position.size = parseFloat(positionResponse.size);
        position.profitPercent = percentChange(position.avgPrice, position.price, position.side) * parseFloat(positionResponse.leverage || '1');
        position.updated = parseInt(positionResponse.updatedTime);
        position.leverage = parseFloat(positionResponse.leverage || '1');
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

function percentChange(openPrice: number, currentPrice: number, side: Side): number {
    if (openPrice === 0) {
        throw new Error("openPrice cannot be zero.");
    }

    const result = ((currentPrice - openPrice) / openPrice) * 100;

    return side === "Sell" ? -result : result;
}