import { Injectable } from "@nestjs/common";
import { ReplaySubject } from "rxjs";
import { ErrorModel } from "src/models/error-model";

@Injectable()
export class ErrorsService {

    private errorsSubject = new ReplaySubject<ErrorModel>(100);

    public get errors$() {
        return this.errorsSubject.asObservable();
    }

    public addError(message: string, err: any) {
        console.error(message);
        this.errorsSubject.next({
            message,
            errorObj: err
        })
    }
}