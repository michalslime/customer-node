import 'express';

declare module 'express' {
  interface Request {
    role: Role | null;
    commonId: string;
    machineId: string | null;
    machineName: string | null;
  }
}
