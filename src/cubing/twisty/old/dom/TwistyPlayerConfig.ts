import { Vector3 } from "three";
import type { Alg } from "../../../alg";
import { DEGREES_PER_RADIAN } from "../../views/3D/TAU";
import {
  AlgAttribute,
  RangedFloatAttribute,
  StringEnumAttribute,
} from "./element/ElementConfig";
import type { TwistyPlayerV1 } from "./TwistyPlayer";
import type { OrbitCoordinates } from "./viewers/TwistyOrbitControls";
import { BackViewLayout, backViewLayouts } from "./viewers/TwistyViewerWrapper";

// const DEFAULT_CAMERA_Z = 5;
// // Golden ratio is perfect for FTO and Megaminx.
// const DEFAULT_CAMERA_Y = DEFAULT_CAMERA_Z * (2 / (1 + Math.sqrt(5)));
export const centeredCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: 31.717474411461005,
  longitude: 0,
  distance: 5.877852522924731,
};

export const cubeCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: 34.44990198795349,
  longitude: 30.96375653207353,
  distance: 5.656854249492381,
};

export const megaminxCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: Math.atan(1 / 2) * DEGREES_PER_RADIAN,
  longitude: 0,
  distance: 6.7,
};

export const pyraminxCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: 26.56505117707799,
  longitude: 0,
  distance: 6,
};

export const cornerCameraOrbitCoordinates: OrbitCoordinates = {
  latitude: 35.264389682754654,
  longitude: 45,
  distance: 6.928203230275509,
};

export const pyraminxLookAt = new Vector3(0, 1 / 6, 0);

// TODO
export function defaultCameraOrbitCoordinates(
  puzzleID: PuzzleID,
): OrbitCoordinates {
  if (puzzleID[1] === "x") {
    return cubeCameraOrbitCoordinates;
  } else {
    switch (puzzleID) {
      case "megaminx":
      case "gigaminx":
        return megaminxCameraOrbitCoordinates;
      case "pyraminx":
      case "master_tetraminx":
        return pyraminxCameraOrbitCoordinates;
      case "skewb":
        return cubeCameraOrbitCoordinates;
      default:
        return centeredCameraOrbitCoordinates;
    }
  }
}

// TODO: turn these maps into lists?
export const setupToLocations = {
  start: true, // default // TODO: "beginning"
  end: true,
};
export type SetupToLocation = keyof typeof setupToLocations;

// TODO: turn these maps into lists?
export const visualizationFormats = {
  "3D": true, // default
  "2D": true,
  "experimental-2D-LL": true, // TODO
  "PG3D": true,
};
export type VisualizationFormat = keyof typeof visualizationFormats;

export const backgroundThemes = {
  checkered: true, // default
  none: true,
};
export type BackgroundTheme = keyof typeof backgroundThemes;

// TODO: turn these maps into lists?
export const hintFaceletStyles = {
  floating: true, // default
  none: true,
};
export type HintFaceletStyle = keyof typeof hintFaceletStyles;

// TODO: turn these maps into lists?
// TODO: alg.cubing.net parity
export const experimentalStickerings = {
  "full": true, // default
  "centers-only": true, // TODO
  "PLL": true,
  "CLS": true,
  "OLL": true,
  "COLL": true,
  "OCLL": true,
  "CLL": true,
  "ELL": true,
  "ELS": true,
  "LL": true,
  "F2L": true,
  "ZBLL": true,
  "ZBLS": true,
  "WVLS": true,
  "VLS": true,
  "LS": true,
  "EO": true,
  "CMLL": true,
  "L6E": true,
  "L6EO": true,
  "Daisy": true,
  "Cross": true,
  "2x2x2": true,
  "2x2x3": true,
  "Void Cube": true,
  "invisible": true,
  "picture": true,
  "experimental-centers-U": true,
  "experimental-centers-U-D": true,
  "experimental-centers-U-L-D": true,
  "experimental-centers-U-L-B-D": true,
  "experimental-centers": true,
  "experimental-fto-fc": true,
  "experimental-fto-f2t": true,
  "experimental-fto-sc": true,
  "experimental-fto-l2c": true,
  "experimental-fto-lbt": true,
};
export type ExperimentalStickering = keyof typeof experimentalStickerings;

export const controlsLocations = {
  "bottom-row": true, // default
  "none": true,
};
export type ControlsLocation = keyof typeof controlsLocations;

export const puzzleIDs = {
  "3x3x3": true, // default
  "custom": true,
  "2x2x2": true,
  "4x4x4": true,
  "5x5x5": true,
  "6x6x6": true,
  "7x7x7": true,
  "40x40x40": true,
  "megaminx": true,
  "pyraminx": true,
  "square1": true,
  "clock": true,
  "skewb": true,
  "fto": true,
  "gigaminx": true,
  "master_tetraminx": true,
};
export type PuzzleID = keyof typeof puzzleIDs;

export const viewerLinkPages = {
  twizzle: true, // default
  none: true,
};
export type ViewerLinkPage = keyof typeof viewerLinkPages;

// TODO: templatize
export interface ManagedAttribute<K> {
  string: string;
  value: K;
  setString(s: string): boolean;
  setValue(v: K): boolean;
}

export const cameraLatitudeLimits = {
  auto: true, // default
  none: true,
};
export type CameraLatitudeLimits = keyof typeof cameraLatitudeLimits;

type AnyManagedAttribute = ManagedAttribute<any>;

interface TwistyPlayerAttributes extends Record<string, AnyManagedAttribute> {
  // Alg
  "alg": AlgAttribute;
  "experimental-setup-alg": AlgAttribute;
  "experimental-setup-anchor": StringEnumAttribute<SetupToLocation>;

  // Puzzle
  "puzzle": StringEnumAttribute<PuzzleID>;
  "visualization": StringEnumAttribute<VisualizationFormat>;
  "hint-facelets": StringEnumAttribute<HintFaceletStyle>;
  "experimental-stickering": StringEnumAttribute<ExperimentalStickering>;

  // Background
  "background": StringEnumAttribute<BackgroundTheme>;
  "control-panel": StringEnumAttribute<ControlsLocation>;

  // 3D config
  "back-view": StringEnumAttribute<BackViewLayout>;
  "experimental-camera-latitude": RangedFloatAttribute;
  "experimental-camera-longitude": RangedFloatAttribute;
  "experimental-camera-latitude-limits": StringEnumAttribute<CameraLatitudeLimits>;

  // Interaction
  "viewer-link": StringEnumAttribute<ViewerLinkPage>;
}

export interface TwistyPlayerConfigValues {
  alg: Alg | string;
  experimentalSetupAlg: Alg | string;
  experimentalSetupAnchor: SetupToLocation;

  puzzle: PuzzleID;
  visualization: VisualizationFormat;
  hintFacelets: HintFaceletStyle;
  experimentalStickering: ExperimentalStickering;

  background: BackgroundTheme;
  controlPanel: ControlsLocation;

  backView: BackViewLayout;
  experimentalCameraLatitude: number;
  experimentalCameraLongitude: number;
  experimentalCameraLatitudeLimits: CameraLatitudeLimits;

  viewerLink: ViewerLinkPage;
}

export type TwistyPlayerInitialConfig = Partial<TwistyPlayerConfigValues>;

const twistyPlayerAttributeMap: Record<
  keyof TwistyPlayerAttributes,
  keyof TwistyPlayerConfigValues
> = {
  "alg": "alg",
  "experimental-setup-alg": "experimentalSetupAlg",
  "experimental-setup-anchor": "experimentalSetupAnchor",

  "puzzle": "puzzle",
  "visualization": "visualization",
  "hint-facelets": "hintFacelets",
  "experimental-stickering": "experimentalStickering",

  "background": "background",
  "control-panel": "controlPanel",

  "back-view": "backView",
  "experimental-camera-latitude": "experimentalCameraLatitude",
  "experimental-camera-longitude": "experimentalCameraLongitude",
  "experimental-camera-latitude-limits": "experimentalCameraLatitudeLimits",

  "viewer-link": "viewerLink",
};

// TODO: Can we avoid instantiating a new class for each attribute, and would it help performance?
export class TwistyPlayerConfig {
  attributes: TwistyPlayerAttributes;
  constructor(
    private twistyPlayer: TwistyPlayerV1, // TODO
    initialValues: TwistyPlayerInitialConfig,
  ) {
    this.attributes = {
      "alg": new AlgAttribute(initialValues.alg),
      "experimental-setup-alg": new AlgAttribute(
        initialValues.experimentalSetupAlg,
      ),
      "experimental-setup-anchor": new StringEnumAttribute(
        setupToLocations,
        initialValues.experimentalSetupAnchor,
      ),

      "puzzle": new StringEnumAttribute(puzzleIDs, initialValues.puzzle),
      "visualization": new StringEnumAttribute(
        visualizationFormats,
        initialValues.visualization,
      ),
      "hint-facelets": new StringEnumAttribute(
        hintFaceletStyles,
        initialValues.hintFacelets,
      ),
      "experimental-stickering": new StringEnumAttribute(
        experimentalStickerings,
        initialValues.experimentalStickering,
      ),

      "background": new StringEnumAttribute(
        backgroundThemes,
        initialValues.background,
      ),
      "control-panel": new StringEnumAttribute(
        controlsLocations,
        initialValues.controlPanel,
      ),
      "back-view": new StringEnumAttribute(
        backViewLayouts,
        initialValues["backView"],
      ),
      "experimental-camera-latitude": new RangedFloatAttribute(
        null,
        -90,
        90,
        initialValues["experimentalCameraLatitude"],
      ),
      "experimental-camera-longitude": new RangedFloatAttribute(
        null,
        -180,
        180,
        initialValues["experimentalCameraLongitude"],
      ),
      "experimental-camera-latitude-limits": new StringEnumAttribute(
        cameraLatitudeLimits,
        initialValues["experimentalCameraLatitudeLimits"],
      ),
      "viewer-link": new StringEnumAttribute(
        viewerLinkPages,
        initialValues.viewerLink,
      ),
    };
  }

  static get observedAttributes(): (keyof TwistyPlayerAttributes & string)[] {
    return Object.keys(twistyPlayerAttributeMap);
  }

  attributeChangedCallback(
    attributeName: string,
    oldValue: string,
    newValue: string,
  ): void {
    const managedAttribute = this.attributes[attributeName];
    if (managedAttribute) {
      // TODO: Handle `null` better.
      if (oldValue !== null && managedAttribute.string !== oldValue) {
        console.warn(
          "Attribute out of sync!",
          attributeName,
          managedAttribute.string,
          oldValue,
        );
      }
      managedAttribute.setString(newValue);

      // TODO: can we make this type-safe?
      // TODO: avoid double-setting in recursive calls
      const propertyName: keyof TwistyPlayerConfigValues =
        twistyPlayerAttributeMap[attributeName];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.twistyPlayer[propertyName] = managedAttribute.value;
    }
  }
}
