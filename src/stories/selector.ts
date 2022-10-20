import PrimeSelect from "../PrimeSelect";

interface IState {
  name: string;
}

// create cache selector using PrimeSelect
export const memoizedFunction = PrimeSelect.createSelector({
  name: "memoizedFunction",
  dependency: (state: IState, somePrimitive: number) => [
    state.name,
    somePrimitive,
  ],
  compute: (state, somePrimitive) => {
    return [...Array(somePrimitive)].map(() => ({
      name: state.name,
      somePrimitive,
    }));
  },
});

export const state: IState = { name: "John" };
