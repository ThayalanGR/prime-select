# Prime Select

[![npm version](https://badge.fury.io/js/prime-select.svg)](https://badge.fury.io/js/prime-select)

> Replacement for libraries like lodash.memo, fast-memoize, reselect / re-reselect packages ?

> **No, Prime Select is a general purpose caching library, used to introduce caching at granular functional level.**

## Offers

---

1. Addresses some common problem with functional caching libraries.
2. Global cache clearance support. (Do not left unwanted computed cached values in memory)
3. Improved metrics about cache functions and memory usage.
4. Shallow / deep cache validation handle support.

## Getting Started

---

#### **Install**

`yarn add prime-select`

or

`npm install prime-select`

#### **Usage**

```typescript
import PrimeSelect from "prime-select";

interface IState {
  name: string;
}

// create cache selector using PrimeSelect
const memoizedFunction = PrimeSelect.createSelector({
  name: "memoizedFunction",
  dependency: (state: IState) => [state.name], // dependency array (same like React's useEffect's deps array)
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

## Using with React

https://codesandbox.io/s/primeselect-2mku74?file=/src/PrimeSelectUsage.tsx

## Storybook

https://main--6351f82565c7fab2bce55dad.chromatic.com/?path=/story/prime-select--usage

## Supported by

[Lumel Technologies](https://lumel.com/)
(Lumel is hiring - Checkout [Careers](https://lumel.com/careers/))
