import PrimeSelect from "../PrimeSelect";

interface IState {
  name: string;
}

// create cache selector using PrimeSelect
export const memoizedFunction = PrimeSelect.createSelector({
  name: "memoizedFunction",
  dependency: (props: { state: IState; somePrimitive: number }) => [
    props.state.name,
    props.somePrimitive,
  ],
  compute: (props) => {
    return {
      name: state.name,
      somePrimitive: props.somePrimitive,
    };
  },
});

export const state: IState = { name: "John" };
