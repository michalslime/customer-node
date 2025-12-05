type RetryTask<T> = () => Promise<T> | T;

interface RetryOptions<T> {
    task: RetryTask<T>;
    initialInterval: number;
    multiplier: number;
    retries: number;
    onSuccess: (result: T) => void;
    onFailure: (error: unknown) => void;
}

export function retryInvokes<T>({
    task,
    initialInterval,
    multiplier,
    retries,
    onSuccess,
    onFailure,
}: RetryOptions<T>) {
    let attempt = 0;
    let currentInterval = initialInterval;

    const execute = async () => {
        try {
            const result = await task();
            onSuccess(result);
        } catch (err) {
            attempt++;

            if (attempt > retries) {
                onFailure(err);
                return;
            }

            currentInterval = currentInterval * multiplier;

            setTimeout(() => {
                execute();
            }, currentInterval);
        }
    };

    // Start pierwszej próby
    setTimeout(execute, initialInterval);
}