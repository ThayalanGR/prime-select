import {
  TCacheMapping,
  ISingletonCache,
  TCreateSelector,
  ICacheObject,
  TCacheValidationType,
} from "./PrimeSelect.types";
import isEqual from "lodash.isequal";

export default class PrimeSelect {
  private static cacheMapping: TCacheMapping = new Map();

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
    const { dependency, cacheValidationType, compute } = props;
    const cache = PrimeSelect.getNewSingletonCache({ cacheValidationType });

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
}
