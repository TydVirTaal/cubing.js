// We need to use a static `import` statement instead of dynamic `import()` to
// test true compatibility (Snowpack behaves differently for those two, for
// example). This may result in an unpreventable extra error in the console.
import { expose } from "../vendor/comlink-everywhere/inside";

export const esmTestAPIImplementation = {
  test: (s) => {
    if (s === "to worker") {
      return "from worker";
    }
  },
};

expose(esmTestAPIImplementation);
