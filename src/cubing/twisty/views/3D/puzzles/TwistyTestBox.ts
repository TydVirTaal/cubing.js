import type { Twisty3DPuzzle } from "./Twisty3DPuzzle";
import { BoxGeometry, MeshBasicMaterial, Object3D, Mesh } from "three";
import type { AlgCursor } from "../../../old/animation/cursor/AlgCursor";
import type { PuzzlePosition } from "../../../old/animation/cursor/CursorTypes";

export class TwistyTestBox extends Object3D implements Twisty3DPuzzle {
  constructor(cursor: AlgCursor) {
    super();
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new Mesh(geometry, material);

    this.add(cube);

    /*...*/
    cursor.addPositionListener(this);
  }

  onPositionChange(_position: PuzzlePosition): void {
    // nothing
  }
}
