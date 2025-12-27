import { filter, Subject, tap } from "rxjs";
import { Coin } from "src/npm-package-base/types";
import { LogFunctions } from "./system-heartbeat";

export type CommandType =
    'SET_STOP_LOSS' |
    'CLOSE_POSITION' |
    'SET_SOFT_STOP_LOSS' |
    'SET_PNL_STOP_LOSS' |
    'OPEN_POSITION' |
    'RESTORE_COMMON_ID_FOR_POSITION' |
    'UPDATE_ONCHAIN_DATA' |
    'RESTORE_DATA_FROM_ONCHAIN' |
    'SAVE_HISTORICAL_POSITION' |
    'LOGIC_BOX_CLOSE_POSITION_PARTIALLY' |
    'ADD_MESSAGE' | 
    'SET_HARD_STOP_LOSS';

export class Command<T> {
    id: string;
    parentId: string | undefined;
    commonId: string;
    createdTimestamp: number;
    coin: Coin;
    type: CommandType;
    payload?: T;
}

const _commands$ = new Subject<Command<any>>();
const waitingCommands: Command<any>[] = [];

export function commandCompleted<T>(command: Command<T>, logFunctions: LogFunctions) {
    logFunctions.logInfo(command.commonId, `${command.coin}: Command: ${command.type} for coin: ${command.coin} processed successfully`, command);
    const commandsToBeTriggered = waitingCommands.filter(x => x.parentId === command.id);
    
    for(const command of commandsToBeTriggered) {
        command.parentId = undefined;
        
        _commands$.next(command);
    }
}

export const dispatchCommand = (c: Command<any>) => _commands$.next(c);

export const commands$ = _commands$.pipe(
    tap(command => {
        if (command.parentId) {
            waitingCommands.push(command);
        }
    }),
    filter(command => !command.parentId)
)