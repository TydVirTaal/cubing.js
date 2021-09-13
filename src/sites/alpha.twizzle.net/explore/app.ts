import { Raycaster, Vector2, Vector3 } from "three";
// Import index files from source.
// This allows Parcel to be faster while only using values exported in the final distribution.
import { Alg, Move } from "../../../cubing/alg";
import { experimentalAppendMove } from "../../../cubing/alg/operation";
import {
  connectSmartPuzzle,
  debugKeyboardConnect,
  MoveEvent,
} from "../../../cubing/bluetooth";
import type { KPuzzleDefinition } from "../../../cubing/kpuzzle";
import { getNotationLayer } from "../../../cubing/kpuzzle/kpuzzle";
import { countMoves } from "../../../cubing/notation";
import {
  getpuzzle,
  getpuzzles,
  parseOptions,
  PuzzleGeometry,
  schreierSims,
  StickerDat,
} from "../../../cubing/puzzle-geometry";
import type { PuzzleGeometryOptions } from "../../../cubing/puzzle-geometry/Options";
import { TwistyPlayerV1 } from "../../../cubing/twisty";
import type { LegacyExperimentalPG3DViewConfig } from "../../../cubing/twisty/old/dom/TwistyPlayer";
import {
  experimentalShowRenderStats,
  Twisty3DCanvas,
} from "../../../cubing/twisty/old/dom/viewers/Twisty3DCanvas";
import {
  OrbitCoordinates,
  positionToOrbitCoordinates,
} from "../../../cubing/twisty/old/dom/viewers/TwistyOrbitControls";
import { getURLParam, setURLParams } from "./url-params";

if (getURLParam("debugShowRenderStats")) {
  experimentalShowRenderStats(true);
}
//experimentalShowJumpingFlash(false); // TODO: Re-implement this

let twisty: TwistyPlayerV1;
let pg: PuzzleGeometry | undefined;
let puzzle: KPuzzleDefinition;
let puzzleSelected = false;
let safeKpuzzle: KPuzzleDefinition | undefined;
let descinput: HTMLInputElement;
let algoinput: HTMLInputElement;
let actions: HTMLSelectElement;
let moveInput: HTMLSelectElement;
let lastval: string = "";
let lastalgo: string = "";
let scramble: number = 0;
let needmovesforscramble: boolean = false;
let stickerDat: StickerDat;
const DEFAULT_CAMERA_DISTANCE = 5.5;
let initialCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: 0,
  longitude: 0,
  distance: DEFAULT_CAMERA_DISTANCE,
};
let savedCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: 0,
  longitude: 0,
  distance: DEFAULT_CAMERA_DISTANCE,
};
let haveSavedCamera = false;
let lastShape: string = "";
let nextShape: string = "";
let tempomult: number = 1.0;
const renderOptions = [
  "centers",
  "edges",
  "corners",
  "blockmoves",
  "vertexmoves",
  "sidebyside",
  "hintstickers",
  "showfoundation",
];
const workOptions = [
  "threed",
  "centers",
  "edges",
  "corners",
  "optimize",
  "blockmoves",
  "allmoves",
  "vertexmoves",
  "killori",
];
let lastRender: any;
let gripdepth: any;
function getCheckbox(a: string): boolean {
  return (document.getElementById(a) as HTMLInputElement).checked;
}

function getCheckboxes(a: string[]): any {
  const r: any = {};
  for (const s of a) {
    r[s] = getCheckbox(s);
  }
  return r;
}

function equalCheckboxes(a: string[], b: any, c: any): boolean {
  for (const s of a) {
    if (b[s] !== c[s]) {
      return false;
    }
  }
  return true;
}

function getModValueForMove(move: Move): number {
  if (!pg) {
    console.log("Bailing on mod; pg is null");
    return 1;
  }
  let family = stickerDat.unswizzle(move);
  for (const axis of stickerDat.axis) {
    if (family === axis[1]) {
      return axis[2] as number;
    }
  }
  console.log("Bailing on mod for " + family + "; no axis match");
  return 1;
}

function intersectionToMove(
  point: Vector3,
  event: MouseEvent,
  rightClick: boolean,
): Move | null {
  const allowRotatingGrips = event.ctrlKey || event.metaKey;
  let bestGrip: string = stickerDat.axis[0][1];
  let bestProduct: number = 0;
  for (const axis of stickerDat.axis) {
    const product = point.dot(new Vector3(...axis[0]));
    if (
      (gripdepth[axis[1]] > 1 || allowRotatingGrips) &&
      product > bestProduct
    ) {
      bestProduct = product;
      bestGrip = axis[1];
    }
  }
  let move = new Move(bestGrip);
  if (bestProduct > 0) {
    if (event.shiftKey) {
      if (getCheckbox("blockmoves")) {
        move = move.modified({ family: bestGrip.toLowerCase() });
      } else {
        move = move.modified({ innerLayer: 2 });
      }
    } else if ((event.ctrlKey || event.metaKey) && gripdepth[bestGrip]) {
      move = move.modified({ family: bestGrip + "v" });
    }
  }
  if (pg) {
    const move2 = pg.notationMapper.notationToExternal(move);
    if (move2 === null) {
      return null;
    }
    move = move2;
  }
  if (getModValueForMove(move) !== 2 && !rightClick) {
    move = move.invert();
  }
  return move;
}

function LucasSetup(
  pg: PuzzleGeometry,
  kpuzzledef: KPuzzleDefinition,
  newStickerDat: StickerDat,
  savealgo: boolean,
): void {
  safeKpuzzle = kpuzzledef; // this holds the scrambled position
  puzzle = kpuzzledef as KPuzzleDefinition;
  const mps = pg.movesetgeos;
  gripdepth = {};
  for (const mp of mps) {
    const grip1 = mp[0] as string;
    const grip2 = mp[2] as string;
    // angle compatibility hack
    gripdepth[grip1] = mp[4];
    gripdepth[grip2] = mp[4];
  }
  algoinput.style.backgroundColor = "";
  stickerDat = newStickerDat;
  if (savealgo && !trimEq(lastalgo, "")) {
    setAlgo(lastalgo, true);
  } else {
    setAlgo("", true);
  }
}

function trimEq(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function updateMoveCount(alg?: Alg): void {
  const len = countMoves(alg ? alg : Alg.fromString(lastalgo));
  const mc = document.getElementById("movecount");
  if (mc) {
    mc.innerText = "Moves: " + len;
  }
}

function saveCamera(): void {
  savedCameraOrbitCoordinates =
    twisty.experimentalDerivedCameraOrbitCoordinates();
  haveSavedCamera = true;
}
//  This function is *not* idempotent when we save the
//  camera position.
function cameraCoords(pg: PuzzleGeometry): OrbitCoordinates {
  if (haveSavedCamera) {
    haveSavedCamera = false;
    return savedCameraOrbitCoordinates;
  }
  const faceCount = pg.baseplanerot.length;
  let geoTowardsViewer = "?";
  if (faceCount === 4) {
    geoTowardsViewer = "FLR";
  } else if (faceCount === 6) {
    geoTowardsViewer = "URF";
  } else if (faceCount === 8) {
    geoTowardsViewer = "FLUR";
  } else if (faceCount === 12) {
    geoTowardsViewer = "F";
  } else if (faceCount === 20) {
    geoTowardsViewer = "F";
  }
  const norm = pg.getGeoNormal(geoTowardsViewer);
  if (norm === undefined) {
    return positionToOrbitCoordinates(
      new Vector3(0, 0, DEFAULT_CAMERA_DISTANCE),
    );
  }
  return positionToOrbitCoordinates(
    new Vector3(...norm).multiplyScalar(DEFAULT_CAMERA_DISTANCE),
  );
}

function legacyExperimentalPG3DViewConfig(): LegacyExperimentalPG3DViewConfig {
  return {
    def: puzzle,
    stickerDat,
    experimentalPolarVantages: true,
    showFoundation: getCheckbox("showfoundation"),
    hintStickers: getCheckbox("hintstickers"),
  };
}

async function setAlgo(str: string, writeback: boolean): Promise<void> {
  let alg: Alg = new Alg();
  const elem = document.querySelector("#twisty-wrapper");
  if (elem) {
    // this part should never throw, and we should not need to do
    // it again.  But for now we always do.
    if (!twisty) {
      elem.textContent = "";
      twisty = new TwistyPlayerV1(
        {
          puzzle: "custom",
          alg: new Alg(),
          visualization: "PG3D",
          backView: getCheckbox("sidebyside") ? "side-by-side" : "top-right",
          experimentalCameraLatitude: initialCameraOrbitCoordinates.latitude,
          experimentalCameraLongitude: initialCameraOrbitCoordinates.longitude,
          experimentalCameraLatitudeLimits: "none",
          // TODO: distance?
          viewerLink: "none",
        },
        legacyExperimentalPG3DViewConfig(),
        (alg: Alg) => {
          markInvalidAlg(alg.toString());
        },
      );
      twisty.timeline.tempoScale = tempomult;
      lastShape = nextShape;
      elem.appendChild(twisty);
      twisty.legacyExperimentalCoalesceModFunc = getModValueForMove;

      const twisty3DCanvases: Twisty3DCanvas[] =
        twisty.viewerElems as Twisty3DCanvas[];
      // TODO: This is a hack.
      // The `Vantage`s are constructed async right now, so we wait until they (probably) exist and then register listeners.
      // `Vantage` should provide a way to register this immediately (or `Twisty` should provide a click handler abstraction).
      setTimeout(() => {
        twisty.experimentalSetCameraOrbitCoordinates(
          initialCameraOrbitCoordinates,
        );
        for (const twisty3DCanvas of twisty3DCanvases) {
          twisty3DCanvas.canvas.addEventListener(
            "mouseup",
            onMouseClick.bind(onMouseClick, twisty3DCanvas, "U"),
            false,
          );
          twisty3DCanvas.canvas.addEventListener(
            "mousedown",
            onMouseClick.bind(onMouseClick, twisty3DCanvas, "D"),
            false,
          );
          twisty3DCanvas.canvas.addEventListener(
            "contextmenu",
            onMouseClick.bind(onMouseClick, twisty3DCanvas, "C"),
            false,
          );
          twisty3DCanvas.canvas.addEventListener(
            "mousemove",
            onMouseMove.bind(onMouseMove, twisty3DCanvas),
            false,
          );
        }
      }, 1);

      puzzleSelected = false;
    } else if (puzzleSelected) {
      await twisty.setCustomPuzzleGeometry(legacyExperimentalPG3DViewConfig());
      if (nextShape !== lastShape) {
        twisty.experimentalCameraLatitude =
          initialCameraOrbitCoordinates.latitude;
        twisty.experimentalCameraLongitude =
          initialCameraOrbitCoordinates.longitude;
        lastShape = nextShape;
      }
      puzzleSelected = false;
    }
    twisty.backView = getCheckbox("sidebyside") ? "side-by-side" : "top-right";
    str = str.trim();
    algoinput.style.backgroundColor = "";
    try {
      alg = Alg.fromString(str);
      str = alg.toString();
      twisty.alg = alg;
      if (!writeback) {
        twisty.timeline.jumpToEnd();
      }
      updateMoveCount(alg);
      setURLParams({ alg: alg });
    } catch (e) {
      markInvalidAlg(str);
    }
    if (writeback) {
      algoinput.value = str;
      lastalgo = str;
    }
  }
}
function markInvalidAlg(str: string): void {
  algoinput.style.backgroundColor = "#ff8080";
  console.log("Could not parse " + str);
}
// this is so horrible.  there has to be a better way.
function showtext(s: string): void {
  const wnd = window.open("", "_blank");
  if (wnd) {
    wnd.document.open("text/plain", "replace");
    wnd.document.write("<pre>");
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    wnd.document.write(s);
    wnd.document.write("</pre>");
    wnd.document.close();
  }
}

function gettextwriter(): (s: string) => void {
  const wnd = window.open("", "_blank");
  if (wnd) {
    wnd.document.open("text/plain", "replace");
    wnd.document.write("<pre>");
    return (s: string): void => {
      s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (wnd && wnd.document) {
        wnd.document.write(s + "\n");
      }
    };
  }
  throw new Error("Could not open window");
}

function dowork(cmd: string): void {
  if (cmd === "scramble") {
    scramble = 100;
    checkchange();
    return;
  }
  if (cmd === "reset") {
    scramble = -1;
    algoinput.value = "";
    checkchange();
    return;
  }
  if (cmd === "bluetooth" || cmd === "keyboard") {
    (async (): Promise<void> => {
      const inputPuzzle = await (cmd === "bluetooth"
        ? connectSmartPuzzle
        : debugKeyboardConnect)();
      inputPuzzle.addMoveListener((e: MoveEvent) => {
        addMove(e.latestMove);
      });
    })();
    return;
  }
  if (cmd === "options") {
    const el = document.getElementById("optionsspan");
    const el2 = document.getElementById("data");
    if (el && el2) {
      if (el.style.display !== "none") {
        el.style.display = "none";
        el2.style.display = "none";
      } else {
        el.style.display = "inline";
        el2.style.display = "inline";
      }
    }
    return;
  }
  const checkboxes = getCheckboxes(workOptions);
  const checkboxOptions: PuzzleGeometryOptions = {
    allMoves: checkboxes.allmoves,
    vertexMoves: checkboxes.vertexmoves,
    includeCornerOrbits: !checkboxes.corners,
    includeEdgeOrbits: !checkboxes.edges,
    includeCenterOrbits: !checkboxes.centers,
    optimizeOrbits: checkboxes.optimize,
    outerBlockMoves: checkboxes.outerblockmoves,
    fixedOrientation: checkboxes.killori,
  };
  const { puzzleDescription, options: parsedOptions } = parseOptions(
    descinput.value.split(" "),
  );
  if (!puzzleDescription) {
    throw new Error("Could not parse puzzle description!"); // TODO
  }
  const options = Object.assign({}, checkboxOptions, parsedOptions);

  const pg = new PuzzleGeometry(puzzleDescription, options);
  nextShape = puzzleDescription.shape;
  pg.allstickers();
  pg.genperms();
  if (cmd === "gap") {
    showtext(pg.writegap());
  } else if (cmd === "ss") {
    const gtw = gettextwriter();
    const os = pg.getOrbitsDef(false);
    const as = os.reassemblySize();
    gtw("Reassembly size is " + as);
    const ss = schreierSims(pg.getMovesAsPerms(), gtw);
    const r = as / ss;
    gtw("Ratio is " + r);
  } else if (cmd === "canon") {
    pg.showcanon(gettextwriter());
  } else if (cmd === "ksolve") {
    showtext(pg.writeksolve("TwizzlePuzzle"));
  } else if (cmd === "svgcmd") {
    showtext(pg.generatesvg(800, 500, 10, getCheckbox("threed")));
  } else if (cmd === "screenshot" || cmd === "screenshot-back") {
    const back = cmd === "screenshot-back";
    console.log(cmd, back);
    const elem = twisty.viewerElems[back ? 1 : 0] as Twisty3DCanvas | undefined;
    if (elem) {
      const url = elem.renderToDataURL({
        squareCrop: true,
        minWidth: 2048,
        minHeight: 2048,
      });
      const a = document.createElement("a");
      a.href = url;
      console.log(getURLParam("puzzlegeometry"));
      a.download = `[${
        getURLParam("puzzle")
          ? getURLParam("puzzle")
          : getURLParam("puzzlegeometry") ?? "twizzle"
      }${back ? " (back)" : ""}]${
        algoinput.value ? " " + algoinput.value : ""
      }.png`; // TODO: this is super hacky.
      a.click();
    }
  } else {
    alert("Command " + cmd + " not handled yet.");
  }
}

function checkchange_internal(): void {
  // for some reason we need to do this repeatedly
  const descarg = descinput.value;
  if (descarg === null) {
    return;
  }
  let algo = algoinput.value;
  if (algo === null) {
    return;
  }
  const newRender = getCheckboxes(renderOptions);
  const renderSame =
    trimEq(descarg, lastval) &&
    equalCheckboxes(renderOptions, lastRender, newRender);
  if (scramble === 0 && trimEq(algo, lastalgo) && renderSame) {
    return;
  }
  const firstLoad = !twisty;
  if (scramble !== 0 || lastval !== descarg || !renderSame) {
    puzzleSelected = true;
    const savecam = lastval === descarg;
    let savealg = true;
    lastval = descarg;
    lastRender = newRender;
    const { puzzleDescription, options: moreOptions } = parseOptions(
      descarg.split(" "),
    );
    if (puzzleDescription) {
      if (savecam) {
        saveCamera();
      }
      const options: PuzzleGeometryOptions = {
        allMoves: true,
        orientCenters: true,
        addRotations: true,
      };
      if (!lastRender.corners) {
        options.grayCorners = true;
      }
      if (!lastRender.edges) {
        options.grayEdges = true;
      }
      if (!lastRender.centers) {
        options.grayCenters = true;
      }
      if (scramble !== 0) {
        if (scramble > 0) {
          options.scrambleAmount = 100;
          needmovesforscramble = true;
        }
        scramble = 0;
        algo = "";
        safeKpuzzle = undefined;
        savealg = false;
      }
      Object.assign(options, moreOptions);
      pg = new PuzzleGeometry(puzzleDescription, options);
      nextShape = puzzleDescription.shape;
      pg.allstickers();
      pg.genperms();
      const sep = "\n";
      const text =
        "Faces " +
        pg.baseplanerot.length +
        sep +
        "Stickers per face " +
        pg.stickersperface +
        sep +
        "Cubies " +
        pg.cubies.length +
        sep +
        "Short edge " +
        pg.shortedge +
        sep +
        "Edge distance " +
        pg.edgedistance +
        sep +
        "Vertex distance " +
        pg.vertexdistance;
      const el = document.getElementById("data");
      if (el) {
        el.title = text;
      }
      let kpuzzledef: KPuzzleDefinition;
      if (renderSame && safeKpuzzle) {
        kpuzzledef = safeKpuzzle;
      } else {
        // the false here means, don't include moves; rely on moveexpander
        kpuzzledef = pg.writekpuzzle(
          true,
          needmovesforscramble,
        ) as KPuzzleDefinition;
        needmovesforscramble = false;
      }
      const newStickerDat = pg.get3d();
      nextShape = puzzleDescription.shape;
      initialCameraOrbitCoordinates = cameraCoords(pg);
      LucasSetup(pg, kpuzzledef, newStickerDat, savealg);
      // Twisty constructor currently ignores initial camera position
      if (firstLoad) {
        twisty.experimentalSetCameraOrbitCoordinates(
          initialCameraOrbitCoordinates,
        );
        twisty.timeline.jumpToEnd();
      }
      setpuzzleparams(descarg);
    }
    if (!savealg) {
      lastalgo = "";
      algo = algoinput.value;
    }
  }
  if (!trimEq(lastalgo, algo)) {
    lastalgo = algo;
    let toparse = "";
    if (algo.trim().length > 0) {
      toparse = algo;
    } else {
      toparse = "";
    }
    if (puzzle) {
      setAlgo(toparse, false);
    }
  }
}

function checkchange(): void {
  try {
    checkchange_internal();
  } catch (e) {
    console.log("Ignoring " + e);
    console.log(e);
  }
}

function doaction(el: any): void {
  const s = el.target.value;
  if (s !== "") {
    actions.selectedIndex = 0;
    dowork(s);
  }
}

function doMoveInputSelection(el: any): void {
  const s = el.target.value;
  if (s !== "") {
    actions.selectedIndex = 0;
    dowork(s);
  }
}

function setpuzzleparams(desc: string): void {
  const puzzles = getpuzzles();
  for (const [name, s] of Object.entries(puzzles)) {
    if (s === desc) {
      updateMoveCount();
      setURLParams({ puzzle: name, puzzlegeometry: "" });
      return;
    }
  }
  updateMoveCount();
  setURLParams({ puzzle: "", puzzlegeometry: desc });
}

function doselection(el: any): void {
  if (el.target.value !== "") {
    puzzleSelected = true;
    descinput.value = el.target.value;
    checkchange();
  }
}

let dragX = -1;
let dragY = -1;
let dragMoved = false;

function onMouseClick(
  twisty3DCanvas: Twisty3DCanvas,
  eventType: string,
  event: MouseEvent,
): void {
  if (eventType === "C") {
    event.preventDefault();
    return;
  }
  if (eventType === "D") {
    dragMoved = false;
    dragX = -1;
    dragY = -1;
    return;
  }
  // at this point event must be U
  if (dragMoved) {
    return;
  }
  if (event.button === 1) {
    // ignore middle mouse button
    return;
  }
  const rightClick = event.button === 2;
  const raycaster = new Raycaster();
  const mouse = new Vector2();
  const canvas: HTMLCanvasElement = twisty3DCanvas.canvas;
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x = (event.offsetX / canvas.offsetWidth) * 2 - 1;
  mouse.y = -((event.offsetY / canvas.offsetHeight) * 2 - 1);
  const camera = twisty3DCanvas.camera;
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  const controlTargets =
    twisty.legacyExperimentalPG3D!.experimentalGetControlTargets();
  const intersects = raycaster.intersectObjects(controlTargets);
  if (intersects.length > 0) {
    event.preventDefault();
    const mv = intersectionToMove(intersects[0].point, event, rightClick);
    if (mv !== null) {
      addMove(mv);
    }
  }
}

function onMouseMove(twisty3DCanvas: Twisty3DCanvas, event: MouseEvent): void {
  // notice drags, since we don't want drags to do click moves
  if (dragX === -1 && dragY === -1) {
    dragX = event.offsetX;
    dragY = event.offsetY;
  } else if (dragX !== event.offsetX || dragY !== event.offsetY) {
    dragMoved = true;
  }
  //
  const raycaster = new Raycaster();
  const mouse = new Vector2();
  const canvas: HTMLCanvasElement = twisty3DCanvas.canvas;
  if (!canvas) {
    return;
  }
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x = (event.offsetX / canvas.offsetWidth) * 2 - 1;
  mouse.y = -((event.offsetY / canvas.offsetHeight) * 2 - 1);
  const camera = twisty3DCanvas.camera;
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  const pg3d = twisty.legacyExperimentalPG3D!;
  const targets = event.shiftKey
    ? pg3d.experimentalGetStickerTargets()
    : pg3d.experimentalGetControlTargets();
  const intersects = raycaster.intersectObjects(targets);
  if (intersects.length > 0) {
    if (pg) {
      const mv2 = pg.notationMapper.notationToExternal(
        new Move(intersects[0].object.userData.name),
      );
      if (mv2 !== null) {
        canvas.title = mv2.family;
      }
    }
  } else {
    canvas.title = "";
  }
}

// TODO: Animate latest move but cancel algorithm moves.
function addMove(move: Move): void {
  if (puzzle && getNotationLayer(puzzle).lookupMove(move) === undefined) {
    return;
  }
  const currentAlg = Alg.fromString(algoinput.value);
  const newAlg = experimentalAppendMove(currentAlg, move, {
    coalesce: true,
    mod: getModValueForMove(move),
  });
  // TODO: Avoid round-trip through string?
  lastalgo = newAlg.toString();
  twisty.experimentalAddMove(move, true, true);
  algoinput.value = lastalgo;
  updateMoveCount(newAlg);
  setURLParams({ alg: newAlg });
}

function settempo(fromURL: any): void {
  if (!fromURL) {
    return;
  }
  const tempo = document.getElementById("tempo") as HTMLInputElement;
  tempomult = +fromURL;
  let sliderval = Math.floor(50 * (1 + Math.log10(tempomult)) + 0.5);
  sliderval = Math.min(sliderval, 100);
  sliderval = Math.max(sliderval, 0);
  tempo.value = "" + sliderval;
  const tempodisp = document.getElementById("tempodisplay");
  if (tempodisp) {
    tempodisp.textContent = "" + tempomult + "x";
  }
  if (twisty) {
    twisty.timeline.tempoScale = tempomult;
  }
}

function checktempo(): void {
  const tempo = document.getElementById("tempo") as HTMLInputElement;
  const val = tempo.value; // 0..100
  tempomult = Math.pow(10, (+val - 50) / 50);
  tempomult = Math.floor(tempomult * 100 + 0.5) / 100;
  setURLParams({ tempo: "" + tempomult });
  const tempodisp = document.getElementById("tempodisplay");
  if (tempodisp) {
    tempodisp.textContent = "" + tempomult + "x";
  }
  if (twisty) {
    twisty.timeline.tempoScale = tempomult;
  }
}

export function setup(): void {
  const select = document.getElementById("puzzleoptions") as HTMLSelectElement;
  descinput = document.getElementById("desc") as HTMLInputElement;
  algoinput = document.getElementById("algorithm") as HTMLInputElement;
  const puzzles = getpuzzles();
  lastRender = getCheckboxes(renderOptions);
  const puz = getURLParam("puzzle");
  const puzdesc = getURLParam("puzzlegeometry");
  let found = false;
  let optionFor3x3x3: HTMLOptionElement;

  for (const [name, desc] of Object.entries(puzzles)) {
    const opt = document.createElement("option") as HTMLOptionElement;
    opt.value = desc;
    opt.textContent = name;
    if (puzdesc === "" && puz === name) {
      opt.selected = true;
      descinput.value = desc;
      found = true;
    }
    if ("3x3x3" === name) {
      optionFor3x3x3 = opt;
    }
    select.add(opt);
  }
  if (puzdesc !== "") {
    select.selectedIndex = 0;
    descinput.value = puzdesc ?? "";
  } else if (!found) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    optionFor3x3x3!.selected = true;
    descinput.value = getpuzzle("3x3x3");
  }
  select.onchange = doselection;
  actions = document.getElementById("action") as HTMLSelectElement;
  actions.onchange = doaction;
  moveInput = document.getElementById("move-input") as HTMLSelectElement;
  moveInput.onchange = doMoveInputSelection;
  const commands = ["scramble", "reset", "options"];
  for (const command of commands) {
    (document.getElementById(command) as HTMLInputElement).onclick =
      (): void => {
        dowork(command);
      };
  }
  const qalg = getURLParam("alg").toString();
  if (qalg !== "") {
    algoinput.value = qalg;
    lastalgo = qalg;
  }
  const tempo = document.getElementById("tempo") as HTMLInputElement;
  tempo.oninput = checktempo;
  settempo(getURLParam("tempo"));
  checkchange();
  setInterval(checkchange, 0.5);
}
