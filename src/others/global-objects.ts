import { HttpService } from "@nestjs/axios";
import { SystemHeartbeat } from "src/npm-package-candidate/system-heartbeat";
import { hashTo6Upper } from "src/npm-package-candidate/utils";

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