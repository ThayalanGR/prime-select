# Prime Select

> Replacement for libraries like reselect / re-reselect ?

> **No, Prime Select is a general purpose caching library, used to introduce caching at granular functional level.**

## Offers

1. Addresses some common problem with functional caching libraries.
2. Global cache clearance support. (Do not left unwanted computed cached values in memory)
3. Improved metrics about cache functions and memory usage.
4. shallow / deep cache validation handle support.

## Demo

### Quick Start

```typescript
import PrimeSelect from "prime-select";

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
```

### Using with React

https://codesandbox.io/s/primeselect-2mku74?file=/src/index.tsx
