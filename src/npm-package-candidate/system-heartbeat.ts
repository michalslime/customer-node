import { HttpService } from "@nestjs/axios";
import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import { firstValueFrom } from "rxjs";
import { toJson, trimTrailingSlash } from "./utils/utils";

type Level = 'info' | 'warning' | 'error';

export type LogFunctions = {
    logError: (commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string) => Promise<void>;
    logWarn: (commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string) => Promise<void>;
    logInfo: (commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string) => Promise<void>;
};

class LogEntry {
    commonId: string;
    applicationName: string;
    machineId: string;
    workspace: string;
    timestamp: number;
    level: Level;
    message: string;
    payload?: any;
    sendEmail?: boolean;
    title?: string;
}

let myPublicUrl: string = 'not-set-yet';
const applicationStartTimestamp: number = Date.now();

export class SystemHeartbeat implements OnModuleInit, OnModuleDestroy {
    public myPublicUrl: string;
    public readonly applicationStartTimestamp: number = applicationStartTimestamp;
    private heartbeatUrl: string = trimTrailingSlash(process.env.HEARTBEAT_URL || '');
    private lastTimestamp: number = Date.now();
    private intervalId: NodeJS.Timeout | null = null;

    constructor(private readonly http: HttpService, public readonly applicationName: string, public readonly machineId: string, _myPublicUrl: string, public readonly workspace: string) {
        const trimmed = trimTrailingSlash(_myPublicUrl);
        myPublicUrl = trimmed;
        this.myPublicUrl = trimmed;
    }

    onModuleInit() {
        this.intervalId = setInterval(() => {
            this.logInfo(randomUUID(), `Heartbeat from ${this.machineId}`);
        }, 60000);
    }

    onModuleDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    async logError(commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string): Promise<void> {
        this.log('error', commonId, message, payload, sendEmail, title);
    }

    async logWarn(commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string): Promise<void> {
        this.log('warning', commonId, message, payload, sendEmail, title);
    }

    async logInfo(commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string): Promise<void> {
        this.log('info', commonId, message, payload, sendEmail, title);
    }

    getLogFunctions(): LogFunctions {
        return {
            logError: this.logError.bind(this),
            logWarn: this.logWarn.bind(this),
            logInfo: this.logInfo.bind(this)
        };
    }

    private async log(level: Level, commonId: string, message: string, payload?: any, sendEmail?: boolean, title?: string): Promise<void> {
        if (!this.heartbeatUrl) {
            console.warn('HEARTBEAT_URL is not set. Skipping heartbeat.');
            return;
        }

        try {
            const logEntry: LogEntry = {
                commonId,
                applicationName: this.applicationName,
                machineId: this.machineId,
                workspace: this.workspace,
                timestamp: Date.now() === this.lastTimestamp ? Date.now() + 1 : Date.now(),
                level: level,
                message,
                sendEmail,
                title
            };

            logEntry.payload = payload ? toJson(payload) : undefined;

            this.lastTimestamp = logEntry.timestamp;

            await firstValueFrom(
                this.http.post(`${this.heartbeatUrl}/log-entry`, logEntry, headers().withCommonId(commonId).withHeartbeatPassword().withMyPublicUrl().withAppStartTimestamp().build())
            );
        } catch (error: any) {
            console.error(`Logging failed: ${error.message}`);
            console.error(`Original log: ${level} - ${commonId} - ${message}`);
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

    async isSystemHealthy(): Promise<boolean> {
        if (!this.heartbeatUrl) {
            console.warn('HEARTBEAT_URL is not set. Skipping heartbeat.');
            return false;
        }

        try {
            const response = await firstValueFrom(
                this.http.get<boolean>(`${this.heartbeatUrl}/workspaces/${this.workspace}/is-healthy`, headers().withHeartbeatPassword().build())
            );

            const isSystemHealthy = response.data;

            return isSystemHealthy
        } catch (error: any) {
            console.error(`Retrieving is healthy status failed: ${error.message}`);
            return false;
        }
    }

    async getAppStartTimestampAsync(commonId: string, machineId: string): Promise<number> {
        const response = await firstValueFrom(
            this.http.get<number>(`${this.heartbeatUrl}/machines/${machineId}/app-start-timestamp`, headers().withCommonId(commonId).withHeartbeatPassword().build())
        );

        return response.data;
    }
}

export function headers(initial?: Record<string, any>) {
    let _headers = { ...(initial ?? {}) };

    const api = {
        withHeartbeatPassword() {
            _headers = {
                ..._headers,
                'x-password': process.env.HEARTBEAT_PASSWORD || '',
            };
            return api;
        },

        withCommonId(commonId: string) {
            _headers = {
                ..._headers,
                'x-common-id': commonId,
            };
            return api;
        },

        withMachineName(machineName: string) {
            _headers = {
                ..._headers,
                'x-machine-name': machineName,
            };
            return api;
        },

        withMachineId(machineId: string) {
            _headers = {
                ..._headers,
                'x-machine-id': machineId,
            };
            return api;
        },

        withMyPublicUrl() {
            _headers = {
                ..._headers,
                'x-request-origin-url': myPublicUrl,
            };
            return api;
        },

        withAppStartTimestamp() {
            _headers = {
                ..._headers,
                'x-app-start-timestamp': applicationStartTimestamp,
            };
            return api;
        },

        build() {
            return { headers: _headers };
        }
    };

    return api;
}
