import { Subject } from "rxjs";
import { Coin } from "src/npm-package-base/types";

export type CommandType =
    'SET_STOP_LOSS' |
    'CLOSE_POSITION' |
    'SET_SOFT_STOP_LOSS' |
    'SET_PNL_STOP_LOSS' |
    'OPEN_POSITION' |
    'RESTORE_COMMON_ID_FOR_POSITION' |
    'UPDATE_ONCHAIN_DATA' |
    'RESTORE_DATA_FROM_ONCHAIN' |
    'SAVE_HISTORICAL_POSITION';

export class Command<T> {
    commonId: string;
    createdTimestamp: number;
    coin: Coin;
    type: CommandType;
    payload?: T;
}

export const commands$ = new Subject<Command<any>>();