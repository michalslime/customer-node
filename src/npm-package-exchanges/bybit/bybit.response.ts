export interface Balance {
    coin: string;
    transferBalance: string;
    walletBalance: string;
    bonus: string;
}

export interface Result {
    memberId: string;
    accountType: string;
    balance: Balance[];
}

export interface BybitBalanceResponse {
    retCode: number;
    retMsg: string;
    result: Result;
    retExtInfo: object;
    time: number;
}