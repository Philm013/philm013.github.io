export function throttle(func, limit) {
    let timeout;
    let lastArgs;
    let lastContext;
    let lastRan;
    return function() {
        lastContext = this;
        lastArgs = arguments;
        if (!lastRan) {
            func.apply(lastContext, lastArgs);
            lastRan = Date.now();
        } else {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(lastContext, lastArgs);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}