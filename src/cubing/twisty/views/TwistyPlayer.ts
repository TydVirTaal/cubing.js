import type { ExperimentalStickering } from "..";
import type { Alg, Move } from "../../alg";
import type { PuzzleDescriptionString } from "../../puzzle-geometry/PGPuzzles";
import type { TwistyAnimationControllerDelegate } from "../controllers/TwistyAnimationController";
import { TwistyPlayerController } from "../controllers/TwistyPlayerController";
import type { HintFaceletStyleWithAuto } from "../model/props/puzzle/display/HintFaceletProp";
import type { MovePressInput } from "../model/props/puzzle/state/MovePressInputProp";
import type { SetupToLocation } from "../model/props/puzzle/state/SetupAnchorProp";
import type { PuzzleID } from "../model/props/puzzle/structure/PuzzleIDRequestProp";
import type { BackgroundThemeWithAuto } from "../model/props/viewer/BackgroundProp";
import type { BackViewLayoutWithAuto } from "../model/props/viewer/BackViewProp";
import {
  ControlPanelThemeWithAuto,
  controlsLocations,
} from "../model/props/viewer/ControlPanelProp";
import type { ViewerLinkPageWithAuto } from "../model/props/viewer/ViewerLinkProp";
import type { VisualizationFormatWithAuto } from "../model/props/viewer/VisualizationProp";
import type { VisualizationStrategy } from "../model/props/viewer/VisualizationStrategyProp";
import { Twisty2DSceneWrapper } from "./2D/Twisty2DSceneWrapper";
import type { PG3D } from "./3D/puzzles/PG3D";
import { Twisty3DSceneWrapper } from "./3D/Twisty3DSceneWrapper";
import { ClassListManager } from "./ClassListManager";
import { TwistyButtonsV2 } from "./control-panel/TwistyButtonsV2";
import { TwistyScrubberV2 } from "./control-panel/TwistyScrubberV2";
import { customElementsShim } from "./node-custom-element-shims";
import { downloadURL, getDefaultFilename, screenshot } from "./screenshot";
import { twistyPlayerCSS } from "./TwistyPlayer.css";
import { TwistyPlayerSettable } from "./TwistyPlayerSettable";

// TODO: I couldn't figure out how to use use more specific types. Ideally, we'd
// enforce consistency with the model.
export const twistyPlayerAttributeMap = {
  // TODO: We assume each of these can be set using a string or will be automatically converted by JS (e.g. numbers). Can we enforce
  // that with types? Do we need to add a translation mechanism for things we
  // don't want to leave settable as strings?
  // TODO: Enum validation.

  // Alg
  "alg": "alg",
  "experimental-setup-alg": "experimentalSetupAlg",

  // String-based
  "experimental-setup-anchor": "experimentalSetupAnchor",
  "puzzle": "puzzle",
  "experimental-puzzle-description": "experimentalPuzzleDescription",
  "visualization": "visualization",
  "hint-facelets": "hintFacelets",
  "experimental-stickering": "experimentalStickering",
  "background": "background",
  "control-panel": "controlPanel",
  "back-view": "backView",
  // "indexer": "indexer",
  "viewer-link": "viewerLink",
  "experimental-move-press-input": "experimentalMovePressInput",

  // Number-based
  "camera-latitude": "cameraLatitude",
  "camera-longitude": "cameraLongitude",
  "camera-distance": "cameraDistance",
  "camera-latitude-limit": "cameraLatitudeLimit",
  "tempo-scale": "tempoScale",

  // URL-based
  "experimental-sprite": "experimentalSprite",
  "experimental-hint-sprite": "experimentalHintSprite",
};

export type TwistyPlayerAttribute = keyof typeof twistyPlayerAttributeMap;

const configKeys: Record<TwistyPlayerAttribute, true> = Object.fromEntries(
  Object.values(twistyPlayerAttributeMap).map((s) => [s, true]),
) as any;

// TODO: Find a way to share this def with `attributeMap`.
export interface TwistyPlayerConfig {
  // Alg
  alg?: Alg | string;
  experimentalSetupAlg?: Alg | string;

  // String-based
  experimentalSetupAnchor?: SetupToLocation; // TODO: "auto"
  puzzle?: PuzzleID;
  experimentalPuzzleDescription?: PuzzleDescriptionString;
  visualization?: VisualizationFormatWithAuto;
  hintFacelets?: HintFaceletStyleWithAuto;
  experimentalStickering?: ExperimentalStickering;
  background?: BackViewLayoutWithAuto;
  controlPanel?: ControlPanelThemeWithAuto;
  backView?: BackViewLayoutWithAuto;
  // "indexer"?: "indexer";
  viewerLink?: ViewerLinkPageWithAuto;
  experimentalMovePressInput?: MovePressInput;

  // Number-based
  cameraLatitude?: number;
  cameraLongitude?: number;
  cameraDistance?: number;
  cameraLatitudeLimit?: number;
  tempoScale?: number;

  // URL-based
  experimentalSprite?: string | null;
  experimentalHintSprite?: string | null;
}

/**
 * TwistyPlayer is the heart of `cubing.js`. It can be used to display a puzzle on a web page like this:
 *
 *     <script src="path/to/cubing/twisty" type="module"></script>
 *     <twisty-player alg="R U R'"></twisty-player>
 *
 * You can also construct it directly in JavaScript:
 *
 *     import { TwistyPlayer } from "cubing/twisty";
 *     const twistyPlayer = new TwistyPlayer({alg: "R U R'"});
 *     // Once the page has loaded, you can do this:
 *     document.body.appendChild(twistyPlayer);
 *
 * See {@link https://js.cubing.net/cubing/} for more examples.
 */
export class TwistyPlayer
  extends TwistyPlayerSettable
  implements TwistyAnimationControllerDelegate
{
  controller: TwistyPlayerController = new TwistyPlayerController(
    this.experimentalModel,
    this,
  );

  buttons: TwistyButtonsV2;

  experimentalCanvasClickCallback: (...args: any) => void = () => {};
  // #onCanvasClick() {

  // }

  constructor(config: TwistyPlayerConfig = {}) {
    super();

    // TODO: double-check that these are all getting set sync without causing extra work.
    for (const [propName, value] of Object.entries(config)) {
      if (!configKeys[propName as TwistyPlayerAttribute]) {
        console.warn(`Invalid config passed to TwistyPlayer: ${propName}`);
        break;
      }
      (this as any)[propName] = value;
    }
  }

  #controlsManager: ClassListManager<ControlPanelThemeWithAuto> =
    new ClassListManager<ControlPanelThemeWithAuto>(
      this,
      "controls-",
      (["auto"] as ControlPanelThemeWithAuto[]).concat(
        Object.keys(controlsLocations) as ControlPanelThemeWithAuto[],
      ),
    );

  #visualizationWrapperElem = document.createElement("div"); // TODO: Better pattern.
  #errorElem = document.createElement("div"); // TODO: Better pattern.
  #alreadyConnected = false; // TODO: support resetting
  async connectedCallback(): Promise<void> {
    if (this.#alreadyConnected) {
      return;
    }
    this.#alreadyConnected = true;
    this.addCSS(twistyPlayerCSS);

    this.addElement(this.#visualizationWrapperElem).classList.add(
      "visualization-wrapper",
    );
    this.addElement(this.#errorElem).classList.add("error-elem");
    this.#errorElem.textContent = "Error";
    this.experimentalModel.userVisibleErrorTracker.addFreshListener(
      (userVisibleError) => {
        const errorString: string | null = userVisibleError.errors[0] ?? null;
        this.contentWrapper.classList.toggle("error", !!errorString);
        if (errorString) {
          this.#errorElem.textContent = errorString;
        }
      },
    );

    const scrubber = new TwistyScrubberV2(this.experimentalModel);
    this.contentWrapper.appendChild(scrubber);

    this.buttons = new TwistyButtonsV2(
      this.experimentalModel,
      this.controller,
      this,
    );
    this.contentWrapper.appendChild(this.buttons);

    this.experimentalModel.background.addFreshListener(
      (backgroundTheme: BackgroundThemeWithAuto) => {
        this.contentWrapper.classList.toggle(
          "checkered",
          backgroundTheme !== "none",
        );
      },
    );

    this.experimentalModel.controlPanel.addFreshListener(
      (controlPanel: ControlPanelThemeWithAuto) => {
        this.#controlsManager.setValue(controlPanel);
      },
    );

    this.experimentalModel.visualizationStrategy.addFreshListener(
      this.#setVisualizationWrapper.bind(this),
    );

    this.experimentalModel.puzzleID.addFreshListener(this.flash.bind(this));
  }

  flash() {
    this.#visualizationWrapper?.animate([{ opacity: 0.25 }, { opacity: 1 }], {
      duration: 250,
    });
  }

  #visualizationWrapper: Twisty2DSceneWrapper | Twisty3DSceneWrapper | null =
    null;

  #visualizationStrategy: VisualizationStrategy | null = null;
  #setVisualizationWrapper(strategy: VisualizationStrategy): void {
    if (strategy !== this.#visualizationStrategy) {
      this.#visualizationWrapper?.remove();
      this.#visualizationWrapper?.disconnect();
      let newWrapper: Twisty2DSceneWrapper | Twisty3DSceneWrapper;
      switch (strategy) {
        case "2D":
        case "experimental-2D-LL":
          newWrapper = new Twisty2DSceneWrapper(
            this.experimentalModel,
            strategy,
          );
          break;
        case "Cube3D":
        case "PG3D":
          // TODO: Properly wire this up so we can set PG3D for the cube.
          newWrapper = new Twisty3DSceneWrapper(this.experimentalModel);
          break;
        default:
          throw new Error("Invalid visualization");
      }
      this.#visualizationWrapperElem.appendChild(newWrapper);
      this.#visualizationWrapper = newWrapper;
      this.#visualizationStrategy = strategy;
    }
  }

  async experimentalCurrentCanvases(): Promise<HTMLCanvasElement[]> {
    this.connectedCallback();
    const wrapper = this.#visualizationWrapper;
    const canvases: HTMLCanvasElement[] = [];
    if (wrapper instanceof Twisty3DSceneWrapper) {
      const vantages = wrapper.experimentalVantages();
      for (const vantage of vantages) {
        canvases.push((await vantage.canvasInfo()).canvas);
      }
    }
    return canvases;
  }

  async experimentalPG3D(): Promise<PG3D | null> {
    this.connectedCallback();
    const wrapper = this.#visualizationWrapper;
    if (wrapper instanceof Twisty3DSceneWrapper) {
      wrapper;
    }
    return null;
  }

  jumpToStart(options?: { flash: boolean }): void {
    this.controller.jumpToStart(options);
  }

  jumpToEnd(options?: { flash: boolean }): void {
    this.controller.jumpToEnd(options);
  }

  play(): void {
    this.controller.togglePlay(true);
  }

  pause(): void {
    this.controller.togglePlay(false);
  }

  // Inspiration:
  // - https://developer.mozilla.org/en-US/docs/Web/API/Element/toggleAttribute (`force` argument)
  // - https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/toggle (`force` argument)
  // We still provide `play()` and `pause()` individually for convenience, though.
  togglePlay(play?: boolean): void {
    this.controller.togglePlay(play);
  }

  // TODO: Animate the new move.
  experimentalAddMove(
    flexibleMove: Move | string,
    options: { coalesce?: boolean } = {},
  ): void {
    this.experimentalModel.experimentalAddMove(flexibleMove, options);
  }

  static get observedAttributes(): string[] {
    return Object.keys(twistyPlayerAttributeMap);
  }

  attributeChangedCallback(
    attributeName: string,
    _oldValue: string,
    newValue: string,
  ): void {
    const setterName =
      twistyPlayerAttributeMap[attributeName as TwistyPlayerAttribute];
    if (!setterName) {
      return;
    }

    (this as any)[setterName] = newValue;
  }

  // TODO: Make this more ergonomic and flexible.
  // TODO: dimensions.
  async experimentalScreenshot(options?: {
    width: number;
    height: number;
  }): Promise<string> {
    return (await screenshot(this.experimentalModel, options)).dataURL;
  }

  // TODO: Make this more ergonomic and flexible.
  // TODO: dimensions.
  async experimentalDownloadScreenshot(filename?: string): Promise<void> {
    if (
      ["2D", "experimental-2D-LL"].includes(
        await this.experimentalModel.visualizationStrategy.get(),
      )
    ) {
      // TODO: This has lots of async issues. It should also go into the screenshot impl file.
      const wrapper2D = this.#visualizationWrapper as Twisty2DSceneWrapper;
      const twisty2DPuzzle = await wrapper2D
        .currentTwisty2DPuzzleWrapper()!
        .twisty2DPuzzle();
      const str = new XMLSerializer().serializeToString(
        twisty2DPuzzle.svg.element,
      );
      const url = URL.createObjectURL(new Blob([str]));
      downloadURL(
        url,
        filename ?? (await getDefaultFilename(this.experimentalModel)),
        "svg",
      );
    } else {
      await (await screenshot(this.experimentalModel)).download(filename);
    }
  }
}

customElementsShim.define("twisty-player", TwistyPlayer);
