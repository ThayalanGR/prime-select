import {
  ISingletonCache,
  TCreateSelector,
  ICacheObject,
  TCacheValidationType,
  ICacheValidateResponse,
  IPrimeSelectConfig,
} from "./PrimeSelect.types";
import isEqual from "lodash.isequal";
import { clone, deepDiff, formKey, roughSizeOfObject } from "./utils";

export default class PrimeSelect {
  private static cacheMapping: Map<string, ISingletonCache<unknown>> =
    new Map();

  private static config: IPrimeSelectConfig = {
    isProduction: process?.env?.NODE_ENV === "production" ?? false,
  };

  private static getNewSingletonCache = <R = unknown>(options?: {
    cacheValidationType?: TCacheValidationType;
  }): ISingletonCache<R> => {
    // options
    const { cacheValidationType = "shallow" } = options ?? {
      cacheValidationType: "shallow",
    };

    // cache
    const cache: ICacheObject<R> = {
      dependency: [],
      result: null as any,
    };

    // handlers
    const setDependency: ISingletonCache<R>["setDependency"] = (dependency) => {
      cache.dependency = dependency;
    };

    const getDependency: ISingletonCache<R>["getDependency"] = () =>
      cache.dependency;

    const setResult: ISingletonCache<R>["setResult"] = (result) => {
      cache.result = result;
    };

    const getResult: ISingletonCache<R>["getResult"] = () => cache.result;

    const validate: ISingletonCache<R>["validate"] = (
      newDependency,
      reComputationMetrics
    ) => {
      let isValid = true;
      let dependencyDiff: ICacheValidateResponse["dependencyDiff"] = [];
      if (newDependency?.length === cache.dependency?.length) {
        if (cacheValidationType === "shallow") {
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
      cache.dependency = [];
      cache.result = null as any;
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

    const isCacheWithCurrentNameAlreadyExists =
      PrimeSelect.cacheMapping.has(name);

    // throws error if detects selector with same name already exists
    if (isCacheWithCurrentNameAlreadyExists) {
      throw new Error(
        `Selector with name ${name} already exists, Please use unique name for each selectors.`
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
      if (subCacheId) {
        const subCacheName = formKey(name, subCacheId);

        // sub cache allocation
        if (PrimeSelect.cacheMapping.has(subCacheName)) {
          cache = PrimeSelect.cacheMapping.get(
            subCacheName
          ) as ISingletonCache<unknown>;
        } else {
          cache = PrimeSelect.getNewSingletonCache({ cacheValidationType });
          PrimeSelect.cacheMapping.set(subCacheName, cache);
        }
      } else {
        cache = PrimeSelect.cacheMapping.get(name) as ISingletonCache<unknown>;
      }

      // gather deps
      const newDependency = dependency(props);

      let reComputationMetrics =
        instanceReComputationMetrics ?? masterReComputationMetrics ?? false;

      if (PrimeSelect.config.isProduction) {
        reComputationMetrics = false;
      }

      // validate cache
      const { isValid: isCacheValid, dependencyDiff } = cache.validate(
        newDependency,
        reComputationMetrics
      );

      // if cache is valid return cached result
      if (isCacheValid) {
        const result = cache.getResult();
        // to handle empty dep array
        if (result) {
          return result;
        }
      }

      if (reComputationMetrics) {
        console.group(
          "Prime Select",
          "ReComputation Metrics",
          ...[name, subCacheId].filter((item) => item !== undefined)
        );
        console.log("Dependency Diff", ...(dependencyDiff ?? []));
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
        name: "",
        cacheSize: { bytes: 0, kilobytes: 0, megabytes: 0 },
        cache: null,
      };

      const accumulateCacheSize = (
        selectorMetricsCacheSize: typeof overallCacheSize
      ) => {
        overallCacheSize.bytes += selectorMetricsCacheSize.bytes;
        overallCacheSize.kilobytes += selectorMetricsCacheSize.kilobytes;
        overallCacheSize.megabytes += selectorMetricsCacheSize.megabytes;
      };

      PrimeSelect.cacheMapping.forEach(
        (currentSelector, currentSelectorName) => {
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
            if (
              selectorMetrics.cacheSize.bytes >
              maxCacheUsageSelector.cacheSize.bytes
            ) {
              maxCacheUsageSelector = selectorMetrics;
            }
          } else {
            maxCacheUsageSelector = selectorMetrics;
          }
          accumulateCacheSize(selectorMetrics.cacheSize);
          overallCache.push(selectorMetrics);
        }
      );
      const selectorsCacheUsageRanked = overallCache.sort(
        (a, b) => b.cacheSize.bytes - a.cacheSize.bytes
      );
      return {
        totalNoOfSelectors: overallCache.length,
        cacheSize: overallCacheSize,
        maxCacheUsageSelector:
          maxCacheUsageSelector.cacheSize.bytes > 0
            ? maxCacheUsageSelector
            : "none",
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
      PrimeSelect.cacheMapping.forEach((currentCache) => {
        currentCache.clearCache();
      });
    }
  };

  static performGlobalGarbageCollection = (verbose: boolean = false) => {
    if (verbose) {
      console.groupCollapsed("PrimeSelect");
      console.log("Before clearing cache", PrimeSelect.getMetrics());
    }

    // clears cache globally
    if (verbose) {
      console.log("Clearing cache");
    }
    PrimeSelect.clearCache();

    if (verbose) {
      console.log("After clearing cache", PrimeSelect.getMetrics());
      console.groupEnd();
    }
  };
}
