import { lazy, ComponentType } from 'react';

/**
 * Retries a dynamic import a few times before giving up, so a transient
 * chunk-load failure (flaky network, CDN hiccup, brief proxy error) doesn't
 * permanently blank a lazily-loaded section.
 */
function retryImport<T>(
  factory: () => Promise<T>,
  retries: number,
  interval: number
): Promise<T> {
  return factory().catch((err) => {
    if (retries <= 0) throw err;
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        retryImport(factory, retries - 1, interval).then(resolve, reject);
      }, interval);
    });
  });
}

/** Drop-in replacement for React.lazy that retries the import on failure. */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  interval = 400
) {
  return lazy(() => retryImport(factory, retries, interval));
}
