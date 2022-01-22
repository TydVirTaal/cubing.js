import { KPuzzle } from "../../../kpuzzle";
import { getCached } from "../../async/lazy-cached";
import type { PuzzleLoader } from "../../PuzzleLoader";

export const clock: PuzzleLoader = {
  id: "clock",
  fullName: "Clock",
  inventedBy: ["Christopher C. Wiggs", "Christopher J. Taylor"],
  inventionYear: 1988, // Patent application year: https://www.jaapsch.net/puzzles/patents/us4869506.pdf
  kpuzzle: getCached(
    async () =>
      new KPuzzle(
        (await import("./clock.kpuzzle.json")).clockKPuzzleDefinition,
      ),
  ),
  svg: getCached(async () => {
    return (await import("./clock.kpuzzle.svg")).default;
  }),
};
