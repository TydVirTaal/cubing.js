import type { Alg } from "../../alg";
import type { KStateData } from "../../kpuzzle";
import { KState } from "../../kpuzzle";
import { puzzles } from "../../puzzles";
import { setIsInsideWorker } from "./inside-worker";
import {
  preInitialize222,
  random222Scramble,
  solve222,
} from "./solve/puzzles/2x2x2";
import {
  initialize333,
  random333FewestMovesScramble,
  random333OrientedScramble,
  random333Scramble,
  solve333,
} from "./solve/puzzles/3x3x3";
import {
  initialize444,
  random444OrientedScramble,
  random444Scramble,
} from "./solve/puzzles/4x4x4";
import { oriented555RandomMoves } from "./solve/puzzles/5x5x5";
import { bigCubeRandomMoves } from "./solve/puzzles/big-cubes";
import { randomFTOScramble } from "./solve/puzzles/fto";
import { solveMegaminx } from "./solve/puzzles/megaminx";
import {
  randomPyraminxScrambleFixedOrientation,
  solvePyraminx,
} from "./solve/puzzles/pyraminx";
import {
  randomSkewbFixedCornerScramble,
  solveSkewb,
} from "./solve/puzzles/skewb";
import { getRandomSquare1Scramble } from "./solve/puzzles/sq1";

setIsInsideWorker(true);

let DEBUG_MEASURE_PERF = true;
export function setDebugMeasurePerf(newDebugMeasurePerf: boolean): void {
  DEBUG_MEASURE_PERF = newDebugMeasurePerf;
}

function now() {
  return (typeof performance === "undefined" ? Date : performance).now();
}

async function measurePerf<T>(
  name: string,
  f: () => T | Promise<T>,
): Promise<T> {
  if (!DEBUG_MEASURE_PERF) {
    return f();
  }

  const start = now();
  const result = f();
  if ((result as any)?.then) {
    await result;
  }
  const end = now();
  console.warn(`${name}: ${Math.round(end - start)}ms`);
  return result;
}

export const insideAPI = {
  initialize: async (eventID: string) => {
    switch (eventID) {
      case "222":
        return measurePerf("preInitialize222", preInitialize222);
      case "333":
      case "333oh":
      case "333ft":
        return measurePerf("initialize333", initialize333);
      case "444":
        return measurePerf("initialize444", initialize444);
      default:
        throw new Error(`unsupported event: ${eventID}`);
    }
  },

  randomScrambleForEvent: async (eventID: string): Promise<Alg> => {
    switch (eventID) {
      case "222":
        return measurePerf("random222Scramble", random222Scramble);
      case "333":
      case "333oh":
      case "333ft":
        return measurePerf("random333Scramble", random333Scramble);
      case "333fm":
        return measurePerf(
          "random333FewestMovesScramble",
          random333FewestMovesScramble,
        );
      case "333bf":
      case "333mb":
        return measurePerf(
          "random333OrientedScramble",
          random333OrientedScramble,
        );
      case "444":
        return measurePerf("random444Scramble", random444Scramble);
      case "444bf":
        return measurePerf(
          "random444OrientedScramble",
          random444OrientedScramble,
        );
      case "555":
        return measurePerf(
          "bigCubeScramble(5)",
          bigCubeRandomMoves.bind(bigCubeRandomMoves, 5),
        );
      case "555bf":
        return measurePerf("oriented555RandomMoves", oriented555RandomMoves);
      case "666":
        return measurePerf(
          "bigCubeScramble(6)",
          bigCubeRandomMoves.bind(bigCubeRandomMoves, 6),
        );
      case "777":
        return measurePerf(
          "bigCubeScramble(7)",
          bigCubeRandomMoves.bind(bigCubeRandomMoves, 7),
        );
      case "skewb":
        return measurePerf(
          "randomSkewbFixedCornerScramble",
          randomSkewbFixedCornerScramble,
        );
      case "pyram":
        return measurePerf(
          "randomPyraminxScrambleFixedOrientation",
          randomPyraminxScrambleFixedOrientation,
        );
      case "sq1":
        return measurePerf(
          "getRandomSquare1Scramble",
          getRandomSquare1Scramble,
        );
      case "fto":
        return measurePerf("randomFTOScramble", randomFTOScramble);
      default:
        throw new Error(`unsupported event: ${eventID}`);
    }
  },

  randomScrambleStringForEvent: async (eventID: string): Promise<string> => {
    return (await insideAPI.randomScrambleForEvent(eventID)).toString();
  },

  solve333ToString: async (stateData: KStateData): Promise<string> => {
    const state = new KState(await puzzles["3x3x3"].kpuzzle(), stateData);
    return (await solve333(state)).toString();
  },

  solve222ToString: async (stateData: KStateData): Promise<string> => {
    const state = new KState(await puzzles["2x2x2"].kpuzzle(), stateData);
    return (await solve222(state)).toString();
  },

  solveSkewbToString: async (stateData: KStateData): Promise<string> => {
    const state = new KState(await puzzles["skewb"].kpuzzle(), stateData);
    return (await solveSkewb(state)).toString();
  },

  solvePyraminxToString: async (stateData: KStateData): Promise<string> => {
    const state = new KState(await puzzles["pyraminx"].kpuzzle(), stateData);
    return (await solvePyraminx(state)).toString();
  },

  solveMegaminxToString: async (stateData: KStateData): Promise<string> => {
    const state = new KState(await puzzles["megaminx"].kpuzzle(), stateData);
    return (await solveMegaminx(state)).toString();
  },

  setDebugMeasurePerf: async (measure: boolean): Promise<void> => {
    setDebugMeasurePerf(measure);
  },
};

export type WorkerInsideAPI = typeof insideAPI;
