import { Position } from "src/models/position";
import { ActiveStopLoss } from "./active-stop-loss";

export class ActivePosition extends Position {
    activeStopLoss?: ActiveStopLoss;
    pnlStopLoss?: number;
}