import { logger } from '../../config/logger.js';

export function logMethod(options: { scope: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      return descriptor;
    }

    descriptor.value = function (...args: any[]) {
      logger.info({ scope: options.scope, method: propertyKey, args }, `Calling method ${propertyKey}`);

      try {
        const result = originalMethod.apply(this, args);

        // async
        if (result && typeof result.then === 'function') {
          return result
            .then((res: any) => {
              logger.info(
                { scope: options.scope, method: propertyKey, result: res },
                `Method ${propertyKey} resolved`
              );
              return res;
            })
            .catch((err: any) => {
              // logging here is not strictly necessary
              logger.error(
                {
                  scope: options.scope,
                  method: propertyKey,
                  error: err.message
                },
                `Method ${propertyKey} rejected`
              );
              throw err;
            });
        }

        // sync
        logger.info(
          { scope: options.scope, method: propertyKey, result },
          `Method ${propertyKey} returned`
        );
        return result;
      } catch (err: any) {
        // logging here is not strictly necessary
        logger.error(
          { scope: options.scope, method: propertyKey, error: err.message },
          `Method ${propertyKey} threw an error`
        );
        throw err;
      }
    };

    return descriptor;
  };
}
