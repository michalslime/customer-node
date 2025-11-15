import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { hashTo6Upper } from "./utils";

type Level = 'info' | 'warning' | 'error';

class LogEntry {
    commonId: string;
    applicationName: string;
    machineName: string;
    timestamp: number;
    level: Level;
    message: string;
    payload?: any;
}

class SystemHeartbeat {
    private heartbeatUrl: string = process.env.HEARTBEAT_URL || '';

    constructor(private readonly http: HttpService, private readonly applicationName: string, private readonly machineName: string) { }

    async logError(commonId: string, message: string, payload?: any): Promise<void> {
        this.log('error', commonId, message, payload);
    }

    async logWarn(commonId: string, message: string, payload?: any): Promise<void> {
        this.log('warning', commonId, message, payload);
    }

    async logInfo(commonId: string, message: string, payload?: any): Promise<void> {
        this.log('info', commonId, message, payload);
    }

    private async log(level: Level, commonId: string, message: string, payload?: any): Promise<void> {
        if (!this.heartbeatUrl) {
            console.warn('HEARTBEAT_URL is not set. Skipping heartbeat.');
            return;
        }

        try {
            const logEntry: LogEntry = {
                commonId,
                applicationName: this.applicationName,
                machineName: this.machineName,
                timestamp: Date.now(),
                level: level,
                message
            };

            logEntry.payload = payload ? JSON.stringify(payload) : undefined;

            await firstValueFrom(
                this.http.post(`${this.heartbeatUrl}/log-entry`, logEntry)
            );
        } catch (error: any) {
            throw new Error(`Ping failed: ${error.message}`);
        }
    }

    async getHeartbeats(timestamp: number): Promise<LogEntry[]> {
        if (!this.heartbeatUrl) {
            console.warn('HEARTBEAT_URL is not set. Skipping heartbeat.');
            return [];
        }

        try {
            const response = await firstValueFrom(
                this.http.get<LogEntry[]>(`${this.heartbeatUrl}/log-entries/${timestamp}`)
            );

            const logEntries = response.data;

            return logEntries
        } catch (error: any) {
            throw new Error(`Ping failed: ${error.message}`);
        }
    }
}

export function getHeaderWithCommonId(commonId: string, header?: any): any {
  return {
    headers: {
      ...(header ?? {}),
      'x-common-id': commonId,
    }
  };
}

const myPublicUrl = process.env.MY_PUBLIC_URL || '';
let machineName = 'unknown-machine';

if (myPublicUrl) {
    machineName = hashTo6Upper(myPublicUrl);
}

let applicationName = 'customer-node';

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
    applicationName += `-${process.env.NODE_ENV}`;
}

export const systemHeartbeat = new SystemHeartbeat(new HttpService(), applicationName, machineName);