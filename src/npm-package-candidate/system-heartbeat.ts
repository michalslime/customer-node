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

export class SystemHeartbeat {
    private heartbeatUrl: string = process.env.HEARTBEAT_URL || '';
    private lastTimestamp: number = Date.now();

    constructor(private readonly http: HttpService, private readonly applicationName: string, private readonly machineName: string) { }

    async logError(ommonId: string, message: string, payload?: any): Promise<void> {
        this.log('error', ommonId, message, payload);
    }

    async logWarn(ommonId: string, message: string, payload?: any): Promise<void> {
        this.log('warning', ommonId, message, payload);
    }

    async logInfo(ommonId: string, message: string, payload?: any): Promise<void> {
        this.log('info', ommonId, message, payload);
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
                timestamp: Date.now() === this.lastTimestamp ? Date.now() + 1 : Date.now(),
                level: level,
                message
            };

            logEntry.payload = payload ? JSON.stringify(payload) : undefined;

            this.lastTimestamp = logEntry.timestamp;

            await firstValueFrom(
                this.http.post(`${this.heartbeatUrl}/log-entry`, logEntry)
            );
        } catch (error: any) {
            console.error(`Logging failed: ${error.message}`);
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
            console.error(`Retrieving logs failed: ${error.message}`);
            return [];
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
