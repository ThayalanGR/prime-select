import {
    ISingletonCache,
    TCreateSelector,
    ICacheObject,
    TCacheValidationType,
    ICacheValidateResponse,
    IPrimeSelectConfig,
} from './PrimeSelect.types';
import isEqual from 'lodash.isequal';
import { clone, deepDiff, formKey, roughSizeOfObject } from './utils';

export default class PrimeSelect {
    private static cacheMapping: Map<string, ISingletonCache<unknown>> = new Map();

    private static resultIdentifierKey: string = formKey('PRIME', 'SELECT', 'RESULT', 'IDENTIFIER');

    private static config: IPrimeSelectConfig = {
        isProduction: false,
        reComputationMetrics: false,
    };

    private static getInitialCacheObject = <R>(): ICacheObject<R> => {
        return {
            dependency: [],
            result: PrimeSelect.resultIdentifierKey as R,
        };
    };

    private static getNewSingletonCache = <R = unknown>(options?: {
        cacheValidationType?: TCacheValidationType;
    }): ISingletonCache<R> => {
        // options
        const { cacheValidationType = 'shallow' } = options ?? {
            cacheValidationType: 'shallow',
        };

        // cache
        const cache = PrimeSelect.getInitialCacheObject<R>();

        // handlers
        const setDependency: ISingletonCache<R>['setDependency'] = (dependency) => {
            cache.dependency = dependency;
        };

        const getDependency: ISingletonCache<R>['getDependency'] = () => cache.dependency;

        const setResult: ISingletonCache<R>['setResult'] = (result) => {
            cache.result = result;
        };

        const getResult: ISingletonCache<R>['getResult'] = () => cache.result;

        const validate: ISingletonCache<R>['validate'] = (newDependency, reComputationMetrics) => {
            let isValid = true;
            let dependencyDiff: ICacheValidateResponse['dependencyDiff'] = [];
            if (newDependency?.length === cache.dependency?.length) {
                if (cacheValidationType === 'shallow') {
                    for (let index = 0; index < newDependency.length; index++) {
                        const newDependencyItem = newDependency[index];
                        const oldDependencyItem = cache.dependency[index];

                        if (newDependencyItem !== oldDependencyItem) {
                            isValid = false;
                            if (reComputationMetrics) {
                                dependencyDiff.push({
                                    previous: clone(oldDependencyItem),
                                    current: clone(newDependencyItem),
                                    index,
                                });
                            }
                            break;
                        }
                    }
                } else {
                    // 'deep' cacheValidationType
                    const isDepsEqual = isEqual(cache.dependency, newDependency); // costly
                    if (!isDepsEqual) {
                        isValid = false;
                        if (reComputationMetrics) {
                            dependencyDiff.push({
                                previous: clone(cache.dependency),
                                current: clone(newDependency),
                                deepDiff: deepDiff(cache.dependency, newDependency),
                            });
                        }
                    }
                }
            } else {
                isValid = false;
            }
            return { isValid, dependencyDiff };
        };

        const clearCache = () => {
            Object.assign(cache, PrimeSelect.getInitialCacheObject());
        };

        // return
        return {
            cache,
            setDependency,
            getDependency,
            setResult,
            getResult,
            validate,
            clearCache,
        };
    };

    static setConfig = (config: Partial<IPrimeSelectConfig>) => {
        PrimeSelect.config = {
            ...PrimeSelect.config,
            ...config,
        };
    };

    private static getCacheFromCacheMapping = <R extends unknown>(
        name: string,
        cacheValidationType?: TCacheValidationType,
    ): ISingletonCache<R> => {
        let cache = PrimeSelect.cacheMapping.get(name);
        if (!cache) {
            cache = PrimeSelect.getNewSingletonCache({ cacheValidationType });
            PrimeSelect.cacheMapping.set(name, cache);
        }
        return cache as ISingletonCache<R>;
    };

    static createSelector: TCreateSelector = (mainProps) => {
        // mainProps
        const {
            name,
            cacheValidationType,
            reComputationMetrics: masterReComputationMetrics,
            dependency,
            compute,
        } = mainProps;

        // cache allocation
        let cache = PrimeSelect.getNewSingletonCache({ cacheValidationType });

        const hasValidCacheName = name && name?.length > 0;

        if (!hasValidCacheName) {
            console.trace();
            throw new Error('Prime Select: Selector should have a valid name');
        }

        const isCacheWithCurrentNameAlreadyExists = PrimeSelect.cacheMapping.has(name);

        // throws error if detects selector with same name already exists
        if (isCacheWithCurrentNameAlreadyExists) {
            console.trace();
            throw new Error(
                `Prime Select: Selector with name ${name} already exists, Please use unique name for each selectors.`,
            );
        }

        PrimeSelect.cacheMapping.set(name, cache);

        return (options) => {
            // prop
            const {
                props,
                subCacheId,
                reComputationMetrics: instanceReComputationMetrics,
            } = options;

            // span - allocate dedicated cache bucket if subCache Id is found
            const cacheName = subCacheId ? formKey(name, subCacheId) : name;
            cache = PrimeSelect.getCacheFromCacheMapping(cacheName, cacheValidationType);

            // gather deps
            const newDependency = dependency(props);

            // flags taken based on priority bottom to top approach
            let reComputationMetrics =
                instanceReComputationMetrics ??
                masterReComputationMetrics ??
                PrimeSelect.config.reComputationMetrics ??
                false;

            if (PrimeSelect.config.isProduction) {
                reComputationMetrics = false;
            }

            // validate cache
            const { isValid: isCacheValid, dependencyDiff } = cache.validate(
                newDependency,
                reComputationMetrics,
            );

            // if cache is valid return cached result
            if (isCacheValid) {
                const result = cache.getResult();
                // to handle empty dep array
                if (result !== PrimeSelect.resultIdentifierKey) {
                    return result;
                }
            }

            if (reComputationMetrics) {
                console.group(
                    'Prime Select',
                    'ReComputation Metrics',
                    ...[name, subCacheId].filter((item) => item !== undefined),
                );
                console.log('Dependency Diff', ...(dependencyDiff ?? []));
                console.groupCollapsed('Tracing');
                console.trace();
                console.groupEnd();
                console.groupEnd();
            }

            // if cache is not valid recompute function and set result
            const newResult = compute(props);
            cache.setDependency(newDependency);
            cache.setResult(newResult);

            // return the newly computed result
            // since return type could be any so overriding the return type
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return newResult as any;
        };
    };

    // metrics
    static getMetrics = (selectorName?: string) => {
        if (selectorName) {
            const currentSelector = PrimeSelect.cacheMapping?.get(selectorName);

            if (!currentSelector) {
                throw new Error(`Selector ${selectorName} not found`);
            }

            const { cache } = currentSelector;

            const cacheSize = roughSizeOfObject(cache);

            return {
                name: selectorName,
                cacheSize,
                cache: clone(cache),
            };
        } else {
            const overallCacheSize: ReturnType<typeof roughSizeOfObject> = {
                bytes: 0,
                kilobytes: 0,
                megabytes: 0,
            };
            // overall metrics
            const overallCache: {
                name: string;
                cacheSize: typeof overallCacheSize;
                cache: unknown;
            }[] = [];
            let maxCacheUsageSelector: {
                name: string;
                cache: unknown;
                cacheSize: typeof overallCacheSize;
            } = {
                name: '',
                cacheSize: { bytes: 0, kilobytes: 0, megabytes: 0 },
                cache: null,
            };

            const accumulateCacheSize = (selectorMetricsCacheSize: typeof overallCacheSize) => {
                overallCacheSize.bytes += selectorMetricsCacheSize.bytes;
                overallCacheSize.kilobytes += selectorMetricsCacheSize.kilobytes;
                overallCacheSize.megabytes += selectorMetricsCacheSize.megabytes;
            };

            PrimeSelect.cacheMapping.forEach((currentSelector, currentSelectorName) => {
                if (!currentSelector) {
                    throw new Error(`Selector ${currentSelectorName} not found`);
                }

                const { cache } = currentSelector;

                const cacheSize = roughSizeOfObject(cache);

                const selectorMetrics = {
                    name: currentSelectorName,
                    cacheSize,
                    cache: cache,
                };
                if (maxCacheUsageSelector) {
                    if (selectorMetrics.cacheSize.bytes > maxCacheUsageSelector.cacheSize.bytes) {
                        maxCacheUsageSelector = selectorMetrics;
                    }
                } else {
                    maxCacheUsageSelector = selectorMetrics;
                }
                accumulateCacheSize(selectorMetrics.cacheSize);
                overallCache.push(selectorMetrics);
            });
            const selectorsCacheUsageRanked = overallCache.sort(
                (a, b) => b.cacheSize.bytes - a.cacheSize.bytes,
            );
            return {
                totalNoOfSelectors: overallCache.length,
                cacheSize: overallCacheSize,
                maxCacheUsageSelector:
                    maxCacheUsageSelector.cacheSize.bytes > 0 ? maxCacheUsageSelector : 'none',
                selectorsCacheUsageRanked,
            };
        }
    };

    /**
     *
     * if selectorName passed cache will be cleared for that particular selector, Clear the cache for all the selectors
     */
    static clearCache = (selectorName?: string): void => {
        if (selectorName) {
            const currentCache = PrimeSelect.cacheMapping?.get(selectorName);

            if (!currentCache) {
                throw new Error(`Selector ${selectorName} not found`);
            }

            const { clearCache } = currentCache;

            clearCache();
        } else {
            PrimeSelect.cacheMapping = new Map();
        }
    };

    static performGlobalGarbageCollection = (verbose: boolean = false) => {
        if (verbose) {
            console.groupCollapsed('PrimeSelect');
            console.log('Before clearing cache', PrimeSelect.getMetrics());
        }

        // clears cache globally
        if (verbose) {
            console.log('Clearing cache');
        }
        PrimeSelect.clearCache();

        if (verbose) {
            console.log('After clearing cache', PrimeSelect.getMetrics());
            console.groupEnd();
        }
    };
}
