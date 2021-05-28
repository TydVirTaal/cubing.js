import { AlgCommon, Comparable } from "../../common";
import { IterationDirection } from "../../iteration";
import type { LeafUnit } from "../Unit";

export class Newline extends AlgCommon<Newline> {
  override toString(): string {
    return `\n`;
  }

  isIdentical(other: Comparable): boolean {
    return other.is(Newline);
  }

  invert(): Newline {
    return this;
  }

  *experimentalExpand(
    _iterDir: IterationDirection = IterationDirection.Forwards,
    _depth: number = Infinity,
  ): Generator<LeafUnit> {
    yield this;
  }
}
