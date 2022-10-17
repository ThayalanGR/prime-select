import {
  TCacheMapping,
  ISingletonCache,
  TCreateSelector,
  ICacheObject,
  TCacheValidationType,
} from "./PrimeSelect.types";
import isEqual from "lodash.isequal";
import { clone, roughSizeOfObject } from "./utils";

export default class PrimeSelect {
  private static cacheMapping: Map<string, ISingletonCache<unknown>> =
    new Map();

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

    const validate: ISingletonCache<R>["validate"] = (newDependency) => {
      let isValid = true;
      if (newDependency?.length === cache.dependency?.length) {
        if (cacheValidationType === "shallow") {
          for (let index = 0; index < newDependency.length; index++) {
            const newDependencyItem = newDependency[index];
            const oldDependencyItem = cache.dependency[index];

            if (newDependencyItem !== oldDependencyItem) {
              isValid = false;
              break;
            }
          }
        } else {
          const isDepsEqual = isEqual(cache.dependency, newDependency);
          if (!isDepsEqual) {
            isValid = false;
          }
        }
      } else {
        isValid = false;
      }
      return isValid;
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

  static createSelector: TCreateSelector = (props) => {
    const { name, cacheValidationType, dependency, compute } = props;
    const cache = PrimeSelect.getNewSingletonCache({ cacheValidationType });

    PrimeSelect.cacheMapping.set(name, cache);

    return (...args) => {
      // gather deps
      const newDependency = dependency(...args);

      // validate cache
      const isCacheValid = cache.validate(newDependency);

      // if cache is valid return cached result
      if (isCacheValid) {
        return cache.getResult();
      }

      // if cache is not valid recompute function and set result
      const newResult = compute(...args);
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
        cache: clone(cache),
        cacheSize,
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
        cache: unknown;
        cacheSize: typeof overallCacheSize;
      }[] = [];
      let maxCacheUsageSelector: {
        name: string;
        cache: unknown;
        cacheSize: typeof overallCacheSize;
      } = {
        name: "",
        cache: null,
        cacheSize: { bytes: 0, kilobytes: 0, megabytes: 0 },
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
            cache: clone(cache),
            cacheSize,
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
