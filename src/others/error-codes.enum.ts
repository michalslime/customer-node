export enum ErrorCodes {
    DEPO_EXCEEDED = 'You try to open too big position',
    TOO_MANY_REQUESTS = 'Send money operation is allowed once a 12h only',
    PENDING_DEFERRED_REFILL = 'There is pending refill',
    INSUFFICIENT_FUNDS = 'Not enough money on wallet',
    TOO_BIG_REFILL = 'Trying to refill amount that will not left then enough money to next Frugal refill'
}