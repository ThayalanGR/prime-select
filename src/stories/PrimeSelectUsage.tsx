import React, { useEffect, useState } from "react";
import PrimeSelect from "../PrimeSelect";

import "./page.css";
import { memoizedFunction, state } from "./selector";

export const PrimeSelectUsage: React.FC = () => {
  // state
  const [, setCount] = useState(0);
  const [mainCacheCount, setMainCacheCount] = useState(0);
  const [subCacheCount, setSubCacheCount] = useState(0);

  // effects
  useEffect(() => {
    setCount((count) => count + 1);
  }, []);

  // compute
  const cache = PrimeSelect.getMetrics();

  // using main cache
  const fromMainCache = memoizedFunction({
    props: { state, somePrimitive: mainCacheCount },
    reComputationMetrics: true,
  });

  // spanning sub cache
  const fromSubCache = memoizedFunction({
    props: {
      state,
      somePrimitive: subCacheCount,
    },
    subCacheId: state.name,
  });

  // paint
  return (
    <div className="wrapper">
      <section className="section section-action">
        <h4>Prime Select Usage</h4>
        <br />
        <h5>Main Cache Sample</h5>
        <br />
        <button onClick={() => setMainCacheCount((count) => count + 1)}>
          Update Main cache
        </button>
        <br />
        <br />
        <pre className="pre-style">
          {JSON.stringify({ fromMainCache }, null, 3)}
        </pre>
        <br />
        <h5>Sub Cache Sample</h5>
        <br />
        <button onClick={() => setSubCacheCount((count) => count + 1)}>
          Update Sub cache
        </button>
        <br />
        <br />
        <pre className="pre-style">
          {JSON.stringify({ fromSubCache }, null, 3)}
        </pre>
      </section>
      <section className="section section-verbose">
        <h4>Prime Select Cache Metrics</h4>
        <pre className="pre-style">{JSON.stringify(cache, null, 3)}</pre>
      </section>
    </div>
  );
};
