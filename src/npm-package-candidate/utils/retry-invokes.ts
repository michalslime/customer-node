type RetryTask<T> = () => Promise<T> | T;

interface RetryOptions<T> {
    task: RetryTask<T>;
    initialInterval: number;
    multiplier: number;
    retries: number;
}

export function retryInvokesAsync<T>({
    task,
    initialInterval,
    multiplier,
    retries,
}: RetryOptions<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        let attempt = 0;
        let currentInterval = initialInterval;

        const execute = async () => {
            try {
                const result = await task();
                resolve(result);
            } catch (err) {
                attempt++;

                if (attempt > retries) {
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
