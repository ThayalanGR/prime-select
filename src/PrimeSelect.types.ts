export type TCreateSelector = <
  Args extends unknown,
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
  dependency: (props: Args) => TDependencyArray;
  /**
   * Compute function should return something either primitive / (arrays / Objects) reference
   * compute function will be called each time the dependency array changes
   */
  compute: (props: Args) => R;

  /**
   * @default shallow
   *
   * shallow - reference based eps comparison - fast - suggested type
   *
   * deep - value based comparison - slower -
   * use only if deps ref gets updated frequently instead of value
   */
  cacheValidationType?: TCacheValidationType;

  /**
   *
   * When true, Verbose about the dependencies that causes recomputation
   * will be printed out - this improves developer debugging efficiency
   *
   * @default false
   */
  reComputationMetrics?: boolean;
}) => TCreateSelectorReturnType<Args, R>;

type TCreateSelectorReturnType<Args extends unknown, R extends unknown> =
  (options: {
    props: Args;
    /**
     * if passed cache function will span based on subCacheId, (useful when dedicated cache bucket needed)
     */
    subCacheId?: string;
    /**
     * This will be used to target the particular used instance of the selector
     *
     * When true, Verbose about the dependencies that causes recomputation
     * will be printed out - this improves developer debugging efficiency
     *
     * @default false
     */
    reComputationMetrics?: boolean;
  }) => R;

// validation type
export type TCacheValidationType = "shallow" | "deep";

// deps array
type TDependencyArray = unknown[];

export interface ICacheObject<R = unknown> {
  dependency: TDependencyArray;
  result: R;
}

export interface ICacheValidateResponse {
  isValid: boolean;
  dependencyDiff?: {
    previous: unknown;
    current: unknown;
    index?: number;
    /**
     * deep diff will be available if cacheValidationType is 'deep'
     */
    deepDiff?: unknown;
  }[];
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
  validate: (
    newDependency: TDependencyArray,
    reComputationMetrics?: boolean
  ) => ICacheValidateResponse;
  /**
   * clears both result and dependency of the singleton cache
   */
  clearCache: () => void;
}

export interface IPrimeSelectConfig {
  isProduction?: boolean;
}
