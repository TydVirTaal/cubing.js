import {
  Color,
  DoubleSide,
  Euler,
  Face3,
  Geometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Triangle,
  Vector3,
} from "three";
import { BlockMove, modifiedBlockMove } from "../../../alg";
import {
  EquivalentTransformations,
  KPuzzleDefinition,
  stateForBlockMove,
  Transformation,
} from "../../../kpuzzle";
import { StickerDat, StickerDatSticker } from "../../../puzzle-geometry";
import { AlgCursor } from "../../animation/alg/AlgCursor";
import { TAU } from "../TAU";
import { Twisty3DPuzzle } from "./Twisty3DPuzzle";
import { smootherStep } from "../../animation/easing";
import { PuzzlePosition } from "../../animation/alg/CursorTypes";

const hintStickers: boolean = false;

const foundationMaterial = new MeshBasicMaterial({
  side: DoubleSide,
  color: 0x000000,
  // transparency doesn't work very well here
  // with duplicated center stickers
  //  transparent: true,
  //  opacity: 0.75,
});
const stickerMaterial = new MeshBasicMaterial({
  vertexColors: true,
  //    side: DoubleSide,
});
const polyMaterial = new MeshBasicMaterial({
  visible: false,
});

function makePoly(
  geo: Geometry,
  coords: number[][],
  color: Color,
  scale: number,
  ind: number,
  faceArray: Face3[],
): void {
  const vertind: number[] = [];
  for (const coord of coords) {
    const v = new Vector3(coord[0], coord[1], coord[2]);
    if (scale !== 1) {
      v.multiplyScalar(scale);
    }
    vertind.push(geo.vertices.length);
    geo.vertices.push(v);
  }
  for (let g = 1; g + 1 < vertind.length; g++) {
    const face = new Face3(vertind[0], vertind[g], vertind[g + 1]);
    face.materialIndex = ind;
    face.color = color;
    geo.faces.push(face);
    faceArray.push(face);
  }
}

class StickerDef {
  public origColor: Color;
  public faceColor: Color;
  public faceArray: Face3[] = [];
  public twistVal: number = -1;
  constructor(fixedGeo: Geometry, stickerDat: StickerDatSticker) {
    this.origColor = new Color(stickerDat.color);
    this.faceColor = new Color(stickerDat.color);
    const coords = stickerDat.coords as number[][];
    makePoly(fixedGeo, coords, this.faceColor, 1, 0, this.faceArray);
    if (hintStickers) {
      let highArea = 0;
      let goodFace = null;
      for (const f of this.faceArray) {
        const t = new Triangle(
          fixedGeo.vertices[f.a],
          fixedGeo.vertices[f.b],
          fixedGeo.vertices[f.c],
        );
        const a = t.getArea();
        if (a > highArea) {
          highArea = a;
          goodFace = t;
        }
      }
      const norm = new Vector3();
      goodFace!.getNormal(norm);
      norm.multiplyScalar(0.5);
      const hintCoords = [];
      for (let i = 0; i < coords.length; i++) {
        const j = coords.length - 1 - i;
        hintCoords.push([
          coords[j][0] + norm.x,
          coords[j][1] + norm.y,
          coords[j][2] + norm.z,
        ]);
      }
      makePoly(fixedGeo, hintCoords, this.faceColor, 1, 0, this.faceArray);
    }
  }

  public addFoundation(
    fixedGeo: Geometry,
    foundationDat: StickerDatSticker,
    black: Color,
  ) {
    makePoly(
      fixedGeo,
      foundationDat.coords as number[][],
      black,
      0.999,
      2,
      this.faceArray,
    );
  }

  public setColor(c: Color): number {
    if (!this.faceColor.equals(c)) {
      this.faceColor.copy(c);
      return 1;
    } else {
      return 0;
    }
  }
}

class HitPlaneDef {
  public cubie: Group;
  protected geo: Geometry;
  constructor(hitface: any) {
    this.cubie = new Group();
    this.geo = new Geometry();
    const coords = hitface.coords as number[][];
    const vertind: number[] = [];
    for (const coord of coords) {
      const v = new Vector3(coord[0], coord[1], coord[2]);
      vertind.push(this.geo.vertices.length);
      this.geo.vertices.push(v);
    }
    for (let g = 1; g + 1 < vertind.length; g++) {
      const face = new Face3(vertind[0], vertind[g], vertind[g + 1]);
      this.geo.faces.push(face);
    }
    this.geo.computeFaceNormals();
    const obj = new Mesh(this.geo, polyMaterial);
    obj.userData.name = hitface.name;
    this.cubie.scale.setScalar(0.99);
    this.cubie.add(obj);
  }
}

class AxisInfo {
  public axis: Vector3;
  public order: number;
  constructor(axisDat: any) {
    const vec = axisDat[0] as number[];
    this.axis = new Vector3(vec[0], vec[1], vec[2]);
    this.order = axisDat[2];
  }
}

const PG_SCALE = 0.5;

// TODO: Split into "scene model" and "view".
/*
 *  PG3D uses a single geometry for the puzzle, with all the faces for
 *  each sticker (including the foundation stickers) in a single
 *  geometry.  We use the materialIndex in the face to point to a
 *  specific entry, which is either a colored sticker, invisible, or
 *  black (foundation).
 *
 *  To support general twisting of a subset of the puzzle, we then
 *  instantiate this same geometry in two different meshes with two
 *  distinct material arrays.  One, the fixed mesh, has the material
 *  array set up like:  [colored, invisible, black, invisible].
 *  The twisting mesh has the material array set up as
 *  [invisible, colored, invislble, black].  When not twisted, the
 *  two meshes are directly coincident, and the (shared) materialIndex
 *  in each face points to a non-invisible material in exactly one of
 *  the two meshes.  When we decide to twist some cubies, we make
 *  the cubies that move point to visible materials in the moving
 *  mesh (which makes them point to invisible materials in the static
 *  mesh).  This way, we only need to rotate the moving mesh as a
 *  single object---this should be very fast, and occur entirely in
 *  the GPU.  Unfortunately this doesn't quite work as fast as we'd
 *  like because three.js makes a draw call every time we have a change
 *  in the material index.  By moving the foundation triangles separate
 *  from the sticker triangles, we enhance the probability that many
 *  triangles can be rendered in one call speeding up the render.
 *
 *  When we decide to support multiple subsets moving at distinct
 *  angular velocities, we will use more than two meshes, with
 *  larger material arrays, maintaining the invariant that each cubie
 *  is visible in only a single mesh.
 */
export class PG3D extends Object3D implements Twisty3DPuzzle {
  private stickers: { [key: string]: StickerDef[][] };
  private axesInfo: { [key: string]: AxisInfo };

  private stickerTargets: Object3D[] = [];
  private controlTargets: Object3D[] = [];

  protected movingObj: Object3D;
  protected fixedGeo: Geometry;
  protected lastPos: Transformation;
  protected lastMove: Transformation;

  constructor(
    cursor: AlgCursor,
    private scheduleRenderCallback: () => void,
    private definition: KPuzzleDefinition,
    private pgdat: StickerDat,
    showFoundation: boolean = false,
  ) {
    super();

    this.axesInfo = {};
    const axesDef = this.pgdat.axis as any[];
    for (const axis of axesDef) {
      this.axesInfo[axis[1]] = new AxisInfo(axis);
    }
    const stickers = this.pgdat.stickers as any[];
    this.stickers = {};
    const materialArray1 = [
      stickerMaterial,
      polyMaterial,
      foundationMaterial,
      polyMaterial,
    ];
    const materialArray2 = [
      polyMaterial,
      stickerMaterial,
      polyMaterial,
      foundationMaterial,
    ];
    const fixedGeo = new Geometry();
    const black = new Color(0);
    for (let si = 0; si < stickers.length; si++) {
      const sticker = stickers[si];
      const orbit = sticker.orbit as number;
      const ord = sticker.ord as number;
      const ori = sticker.ori as number;
      if (!this.stickers[orbit]) {
        this.stickers[orbit] = [];
      }
      if (!this.stickers[orbit][ori]) {
        this.stickers[orbit][ori] = [];
      }
      const stickerdef = new StickerDef(fixedGeo, sticker);
      this.stickers[orbit][ori][ord] = stickerdef;
    }
    if (showFoundation) {
      for (let si = 0; si < stickers.length; si++) {
        const sticker = stickers[si];
        const foundation = this.pgdat.foundations[si];
        const orbit = sticker.orbit as number;
        const ord = sticker.ord as number;
        const ori = sticker.ori as number;
        this.stickers[orbit][ori][ord].addFoundation(
          fixedGeo,
          foundation,
          black,
        );
      }
    }
    fixedGeo.computeFaceNormals();
    const obj = new Mesh(fixedGeo, materialArray1);
    obj.scale.set(PG_SCALE, PG_SCALE, PG_SCALE);
    this.add(obj);
    const obj2 = new Mesh(fixedGeo, materialArray2);
    obj2.scale.set(PG_SCALE, PG_SCALE, PG_SCALE);
    this.add(obj2);
    const hitfaces = this.pgdat.faces as any[];
    this.movingObj = obj2;
    this.fixedGeo = fixedGeo;
    for (const hitface of hitfaces) {
      const facedef = new HitPlaneDef(hitface);
      facedef.cubie.scale.set(PG_SCALE, PG_SCALE, PG_SCALE);
      this.add(facedef.cubie);
      this.controlTargets.push(facedef.cubie.children[0]);
    }

    cursor!.addPositionListener(this);
  }

  public experimentalGetStickerTargets(): Object3D[] {
    return this.stickerTargets;
  }

  public experimentalGetControlTargets(): Object3D[] {
    return this.controlTargets;
  }

  public onPositionChange(p: PuzzlePosition): void {
    const pos = p.state as Transformation;
    const noRotation = new Euler();
    this.movingObj.rotation.copy(noRotation);
    let colormods = 0;
    if (
      !this.lastPos ||
      !EquivalentTransformations(this.definition, this.lastPos, pos)
    ) {
      for (const orbit in this.stickers) {
        const pieces = this.stickers[orbit];
        const pos2 = pos[orbit];
        const orin = pieces.length;
        for (let ori = 0; ori < orin; ori++) {
          const pieces2 = pieces[ori];
          for (let i = 0; i < pieces2.length; i++) {
            const nori = (ori + orin - pos2.orientation[i]) % orin;
            const ni = pos2.permutation[i];
            colormods += pieces2[i].setColor(pieces[nori][ni].origColor);
          }
        }
      }
      this.lastPos = pos;
    }
    // FIXME tgr const kp = new KPuzzle(this.definition);
    let vismods = 0;
    for (const moveProgress of p.movesInProgress) {
      const externalBlockMove = moveProgress.move as BlockMove;
      // TODO: unswizzle goes external to internal, and so does the call after that
      // and so does the stateForBlockMove call
      const unswizzled = this.pgdat.unswizzle(externalBlockMove);
      const blockMove = this.pgdat.notationMapper.notationToInternal(
        externalBlockMove,
      );
      const simpleMove = modifiedBlockMove(externalBlockMove, { amount: 1 });
      const baseMove = stateForBlockMove(this.definition, simpleMove);
      const ax = this.axesInfo[unswizzled];
      const turnNormal = ax.axis;
      const angle =
        (-this.ease(moveProgress.fraction) *
          moveProgress.direction *
          blockMove.amount *
          TAU) /
        ax.order;
      this.movingObj.rotateOnAxis(turnNormal, angle);
      if (this.lastMove !== baseMove) {
        for (const orbit in this.stickers) {
          const pieces = this.stickers[orbit];
          const orin = pieces.length;
          const bmv = baseMove[orbit];
          for (let ori = 0; ori < orin; ori++) {
            const pieces2 = pieces[ori];
            for (let i = 0; i < pieces2.length; i++) {
              const ni = bmv.permutation[i];
              let tv = 0;
              if (ni !== i || bmv.orientation[i] !== 0) {
                tv = 1;
              }
              if (tv !== pieces2[i].twistVal) {
                if (tv) {
                  for (const f of pieces2[i].faceArray) {
                    f.materialIndex |= 1;
                  }
                } else {
                  for (const f of pieces2[i].faceArray) {
                    f.materialIndex &= ~1;
                  }
                }
                pieces2[i].twistVal = tv;
                vismods++;
              }
            }
          }
        }
        this.lastMove = baseMove;
      }
    }
    if (vismods) {
      this.fixedGeo.groupsNeedUpdate = true;
    }
    if (colormods) {
      this.fixedGeo.colorsNeedUpdate = true;
    }
    this.scheduleRenderCallback!();
  }

  private ease(fraction: number): number {
    return smootherStep(fraction);
  }
}
