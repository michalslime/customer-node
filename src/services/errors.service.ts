import { Injectable } from "@nestjs/common";
import { ReplaySubject } from "rxjs";
import { ErrorModel } from "src/models/error-model";
import { systemHeartbeat } from "src/npm-package-candidate/system-heartbeat";

@Injectable()
export class ErrorsService {

    private errorsSubject = new ReplaySubject<ErrorModel>(100);

    public get errors$() {
        return this.errorsSubject.asObservable();
    }

    public addError(message: string, err: any, commonId: string): void {
        console.error(message);

        systemHeartbeat.logError(commonId, message, err);
        
        this.errorsSubject.next({
            message,
            errorObj: err
        })
    }
}