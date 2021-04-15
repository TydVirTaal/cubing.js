import { Alg } from "./Alg";
import { AlgBuilder } from "./AlgBuilder";
import { Unit } from "./units";
import { Commutator } from "./units/containers/Commutator";
import { Conjugate } from "./units/containers/Conjugate";
import { Grouping } from "./units/containers/Grouping";
import { LineComment } from "./units/leaves/LineComment";
import { Move, QuantumMove } from "./units/leaves/Move";
import { Newline } from "./units/leaves/Newline";
import { Pause } from "./units/leaves/Pause";
import { RepetitionInfo } from "./units/Repetition";

type StoppingChar = "," | ":" | "]" | ")";

function parseIntWithEmptyFallback<T>(n: string, emptyFallback: T): number | T {
  return n ? parseInt(n) : emptyFallback;
}

const repetitionRegex = /^(\d+)?('?)/;
const moveStartRegex = /^[_\dA-Za-z]/;
const quantumMoveRegex = /^((([1-9]\d*)-)?([1-9]\d*))?([_A-Za-z]+)?/;
const commentTextRegex = /[^\n]*/;

export function parseAlg(s: string): Alg {
  return new AlgParser().parseAlg(s);
}

export function parseMove(s: string): Move {
  return new AlgParser().parseMove(s);
}

export function parseQuantumMove(s: string): QuantumMove {
  return new AlgParser().parseQuantumMove(s);
}

export interface ParserIndexed {
  charIndex: number;
}

export type Parsed<T extends Alg | Unit> = T & ParserIndexed;

function addCharIndex<T extends Alg | Unit>(
  t: T,
  charIndex: number,
): Parsed<T> {
  const parsedT = t as ParserIndexed & T;
  parsedT.charIndex = charIndex;
  return parsedT;
}

export function transferCharIndex<T extends Alg | Unit>(from: T, to: T): T {
  if ("charIndex" in from) {
    (to as Parsed<T>).charIndex = (from as Parsed<T>).charIndex;
  }
  return to;
}

// TODO: support recording string locations for moves.
class AlgParser {
  #input: string = "";
  #idx: number = 0;

  parseAlg(input: string): Parsed<Alg> {
    this.#input = input;
    this.#idx = 0;
    const alg = this.parseAlgWithStopping([]);
    this.mustBeAtEndOfInput();
    return alg;
  }

  parseMove(input: string): Parsed<Move> {
    this.#input = input;
    this.#idx = 0;
    const move = this.parseMoveImpl();
    this.mustBeAtEndOfInput();
    return move;
  }

  parseQuantumMove(input: string): QuantumMove {
    this.#input = input;
    this.#idx = 0;
    const quantumMove = this.parseQuantumMoveImpl();
    this.mustBeAtEndOfInput();
    return quantumMove;
  }

  private mustBeAtEndOfInput() {
    if (this.#idx !== this.#input.length) {
      throw new Error("parsing unexpectedly ended early");
    }
  }

  private parseAlgWithStopping(stopBefore: StoppingChar[]): Parsed<Alg> {
    const algStartIdx = this.#idx;
    const algBuilder = new AlgBuilder();

    // We're "crowded" if there was not a space or newline since the last unit.
    let crowded = false;

    const mustNotBeCrowded = (): void => {
      if (crowded) {
        throw new Error(
          `Unexpected unit at idx ${this.#idx}. Are you missing a space?`,
        ); // TODO better error message
      }
    };

    mainLoop: while (this.#idx < this.#input.length) {
      const savedCharIndex = this.#idx;
      if ((stopBefore as string[]).includes(this.#input[this.#idx])) {
        return addCharIndex(algBuilder.toAlg(), algStartIdx);
      }
      if (this.tryConsumeNext(" ")) {
        crowded = false;
        continue mainLoop;
      } else if (moveStartRegex.test(this.#input[this.#idx])) {
        mustNotBeCrowded();
        const move = this.parseMoveImpl();
        algBuilder.push(move);
        crowded = true;
        continue mainLoop;
      } else if (this.tryConsumeNext("(")) {
        mustNotBeCrowded();
        const alg = this.parseAlgWithStopping([")"]);
        this.mustConsumeNext(")");
        const repetitionInfo = this.parseRepetition();
        algBuilder.push(
          addCharIndex(new Grouping(alg, repetitionInfo), savedCharIndex),
        );
        crowded = true;
        continue mainLoop;
      } else if (this.tryConsumeNext("[")) {
        mustNotBeCrowded();
        const A = this.parseAlgWithStopping([",", ":"]);
        const separator = this.popNext();
        const B = this.parseAlgWithStopping(["]"]);
        this.mustConsumeNext("]");
        const repetitionInfo = this.parseRepetition();
        switch (separator) {
          case ":":
            algBuilder.push(
              addCharIndex(new Conjugate(A, B, repetitionInfo), savedCharIndex),
            );
            crowded = true;
            continue mainLoop;
          case ",":
            algBuilder.push(
              addCharIndex(
                new Commutator(A, B, repetitionInfo),
                savedCharIndex,
              ),
            );
            crowded = true;
            continue mainLoop;
          default:
            throw "unexpected parsing error";
        }
      } else if (this.tryConsumeNext("\n")) {
        algBuilder.push(addCharIndex(new Newline(), savedCharIndex));
        crowded = false;
        continue mainLoop;
      } else if (this.tryConsumeNext("/")) {
        this.mustConsumeNext("/");
        const [text] = this.parseRegex(commentTextRegex);
        algBuilder.push(addCharIndex(new LineComment(text), savedCharIndex));
        crowded = false;
        continue mainLoop;
      } else if (this.tryConsumeNext(".")) {
        mustNotBeCrowded();
        algBuilder.push(addCharIndex(new Pause(), savedCharIndex));
        while (this.tryConsumeNext(".")) {
          algBuilder.push(addCharIndex(new Pause(), this.#idx - 1)); // TODO: Can we precompute index similarly to other units?
        }
        crowded = true;
        continue mainLoop;
      } else {
        throw new Error(`Unexpected character: ${this.popNext()}`);
      }
    }

    if (this.#idx !== this.#input.length) {
      throw new Error("did not finish parsing?");
    }
    if (stopBefore.length > 0) {
      throw new Error("expected stopping");
    }
    return addCharIndex(algBuilder.toAlg(), algStartIdx);
  }

  private parseQuantumMoveImpl(): QuantumMove {
    const [, , , outerLayerStr, innerLayerStr, family] = this.parseRegex(
      quantumMoveRegex,
    );

    return new QuantumMove(
      family,
      parseIntWithEmptyFallback(innerLayerStr, undefined),
      parseIntWithEmptyFallback(outerLayerStr, undefined),
    );
  }

  private parseMoveImpl(): Parsed<Move> {
    const savedCharIndex = this.#idx;
    const quantumMove = this.parseQuantumMoveImpl();
    const repetitionInfo = this.parseRepetition();

    const move = addCharIndex(
      new Move(quantumMove, repetitionInfo),
      savedCharIndex,
    );
    return move;
  }

  private parseRepetition(): RepetitionInfo {
    const [, absAmountStr, primeStr] = this.parseRegex(repetitionRegex);
    return [parseIntWithEmptyFallback(absAmountStr, null), primeStr === "'"];
  }

  private parseRegex(regex: RegExp): RegExpExecArray {
    const arr = regex.exec(this.remaining());
    if (arr === null) {
      throw new Error("internal parsing error"); // TODO
    }
    this.#idx += arr[0].length;
    return arr;
  }

  private remaining(): string {
    return this.#input.slice(this.#idx);
  }

  private popNext(): string {
    const next = this.#input[this.#idx];
    this.#idx++;
    return next;
  }

  private tryConsumeNext(expected: string): boolean {
    if (this.#input[this.#idx] === expected) {
      this.#idx++;
      return true;
    }
    return false;
  }

  private mustConsumeNext(expected: string): string {
    const next = this.popNext();
    if (next !== expected) {
      throw new Error(
        `expected \`${expected}\` while parsing, encountered ${next}`,
      ); // TODO: be more helpful
    }
    return next;
  }
}
