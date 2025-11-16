import { Injectable } from "@nestjs/common";
import { ReplaySubject } from "rxjs";
import { ErrorModel } from "src/models/error-model";
import { SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";

@Injectable()
export class ErrorsService {

    private errorsSubject = new ReplaySubject<ErrorModel>(100);

    constructor(private readonly systemHeartbeat: SystemHeartbeat) {}

    public get errors$() {
        return this.errorsSubject.asObservable();
    }

    public addError(message: string, err: any, commonId: string): void {
        console.error(message);

        this.systemHeartbeat.logError(commonId, message, err);
        
        this.errorsSubject.next({
            message,
            errorObj: err
        })
    }
}