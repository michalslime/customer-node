type RetryTask<T> = () => Promise<T> | T;

interface RetryStatistics {
    attempts: number;
    failures: number;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    lastError?: unknown;
    succeeded?: boolean;
}

interface RetryOptions<T> {
    task: RetryTask<T>;
    initialInterval: number;
    multiplier: number;
    retries: number;
    onFinally?: (stats: RetryStatistics) => void;
}

export function retryInvokesAsync<T>({
    task,
    initialInterval,
    multiplier,
    retries,
    onFinally,
}: RetryOptions<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        let attempt = 0;
        let currentInterval = initialInterval;

        const stats: RetryStatistics = {
            attempts: 0,
            failures: 0,
            startTime: Date.now(),
        };

        const finalize = () => {
            stats.endTime = Date.now();
            stats.durationMs = stats.endTime - stats.startTime;
            onFinally?.(stats);
        };

        const execute = async () => {
            stats.attempts++;

            try {
                const result = await task();
                stats.succeeded = true;
                finalize();
                resolve(result);
            } catch (err) {
                stats.failures++;
                stats.lastError = err;
                attempt++;

                if (attempt > retries) {
                    stats.succeeded = false;
                    finalize();
                    reject(err);
                    return;
                }

                currentInterval *= multiplier;
                setTimeout(execute, currentInterval);
            }
        };

        setTimeout(execute, initialInterval);
    });
}
