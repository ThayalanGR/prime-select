export type TCreateSelector = <
  Args extends unknown[],
  R extends unknown
>(mainProps: {
  /**
   * Name of the selector
   */
  name: string;
  /**
   * Dependency array should be returned
   * array can contain one of the following type
   * 1. primitives (number, string, boolean)
   * 2. arrays / Objects - reference change of those items will cause the
   * cache to revalidate by calling compute function
   */
  dependency: (...args: Args) => TDependencyArray;
  /**
   * Compute function should return something either primitive / (arrays / Objects) reference
   * compute function will be called each time the dependency array changes
   */
  compute: (...args: Args) => R;

  /**
   * @default 'shallow'
   *
   * shallow - reference based eps comparison - fast - suggested type
   *
   * deep - value based comparison - slower -
   * use only if deps ref gets updated frequently instead of value
   */
  cacheValidationType?: TCacheValidationType;
}) => TCreateSelectorReturnType<Args, R>;

type TCreateSelectorReturnType<
  Args extends unknown[],
  R extends unknown
> = (props: {
  args: Args;
  /**
   * if passed cache function will span based on subCacheId, (useful when dedicated cache bucket needed)
   */
  subCacheId?: string;
}) => R;

// validation type
export type TCacheValidationType = "shallow" | "deep";

// deps array
type TDependencyArray = unknown[];

// cache related typings
export type TCacheMapping = Map<string, unknown>;

export interface ICacheObject<R = unknown> {
  dependency: TDependencyArray;
  result: R;
}

export interface ISingletonCache<R extends unknown> {
  cache: ICacheObject<R>;

  setDependency: (dependency: TDependencyArray) => void;
  getDependency: () => TDependencyArray;

  setResult: (result: R) => void;
  getResult: () => R;

  /**
   * return `true` if newDependency matches with oldDependency
   */
  validate: (newDependency: TDependencyArray) => boolean;
  /**
   * clears both result and dependency of the singleton cache
   */
  clearCache: () => void;
}
