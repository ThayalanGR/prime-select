import PrimeSelect from "../PrimeSelect";

interface IState {
  name: string;
}

// create cache selector using PrimeSelect
const memoizedFunction = PrimeSelect.createSelector({
  name: "memoizedFunction",
  dependency: (state: IState) => [state.name],
  compute: (state) => {
    return state.name;
  },
});

const state: IState = { name: "John" };

// using main cache
const fromMainCache = memoizedFunction({ args: [state] });

// spanning sub cache
const fromSubCache = memoizedFunction({
  args: [state],
  subCacheId: state.name,
});
