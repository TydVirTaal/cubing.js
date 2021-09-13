import { AlgProp } from "./depth-0/AlgProp";
import { BackgroundProp } from "./depth-0/BackgroundProp";
import { BackViewProp } from "./depth-0/BackViewProp";
import { ControlPanelProp } from "./depth-0/ControlPanelProp";
import { HintFaceletProp } from "./depth-0/HintFaceletProp";
import { IndexerConstructorRequestProp } from "./depth-0/IndexerConstructorRequestProp";
import { LatitudeLimitProp } from "./depth-0/LatitudeLimit";
import { OrbitCoordinatesRequestProp } from "./depth-0/OrbitCoordinatesRequestProp";
import { PlayingInfoProp } from "./depth-0/PlayingInfoProp";
import { PuzzleIDProp } from "./depth-0/PuzzleIDProp";
import { SetupAnchorProp } from "./depth-0/SetupAnchorProp";
import { StickeringProp } from "./depth-0/StickeringProp";
import { TempoScaleProp } from "./depth-0/TempoScaleProp";
import { TimestampRequestProp } from "./depth-0/TimestampRequestProp";
import { URLProp } from "./depth-0/URLProp";
import { ViewerLinkProp } from "./depth-0/ViewerLinkProp";
import { VisualizationFormatProp } from "./depth-0/VisualizationProp";
import { OrbitCoordinatesProp } from "./depth-1/OrbitCoordinatesProp";
import { PuzzleDefProp } from "./depth-1/PuzzleDefProp";
import { SpriteProp } from "./depth-1/SpriteProp";
import { VisualizationStrategyProp } from "./depth-1/VisualizationStrategyProp";
import { IndexerConstructorProp } from "./depth-2/IndexerConstructorProp";
import { PuzzleAlgProp } from "./depth-2/PuzzleAlgProp";
import { AlgTransformationProp } from "./depth-3/AlgTransformationProp";
import { IndexerProp } from "./depth-3/IndexerProp";
import { AnchoredStartProp } from "./depth-4/AnchoredStartProp";
import { TimeRangeProp } from "./depth-4/TimeRangeProp";
import { DetailedTimelineInfoProp } from "./depth-5/DetailedTimelineInfoProp";
import { CoarseTimelineInfoProp } from "./depth-6/CoarseTimelineInfoProp";
import { CurrentLeavesProp } from "./depth-6/CurrentLeavesProp";
import { ButtonAppearanceProp } from "./depth-7/ButtonAppearanceProp";
import { CurrentLeavesSimplifiedProp } from "./depth-7/CurrentLeavesSimplified";
import { CurrentTransformationProp } from "./depth-8/CurrentTransformationProp";
import { LegacyPositionProp } from "./depth-9/LegacyPositionProp";

export class TwistyPlayerModel {
  // TODO: Redistribute and group props with controllers.

  // Depth 0
  algProp = new AlgProp();
  backgroundProp = new BackgroundProp();
  backViewProp = new BackViewProp();
  controlPanelProp = new ControlPanelProp();
  foundationStickerSpriteURL = new URLProp();
  hintFaceletProp = new HintFaceletProp();
  hintStickerSpriteURL = new URLProp();
  indexerConstructorRequestProp = new IndexerConstructorRequestProp();

  latitudeLimitProp = new LatitudeLimitProp();
  orbitCoordinatesRequestProp: OrbitCoordinatesRequestProp =
    new OrbitCoordinatesRequestProp();

  playingInfoProp = new PlayingInfoProp();
  puzzleIDProp = new PuzzleIDProp();
  setupAnchorProp = new SetupAnchorProp();
  setupProp = new AlgProp();
  stickeringProp = new StickeringProp();
  tempoScaleProp = new TempoScaleProp();
  timestampRequestProp = new TimestampRequestProp();
  viewerLinkProp = new ViewerLinkProp();
  visualizationFormatProp = new VisualizationFormatProp();

  // Depth 1
  foundationStickerSprite = new SpriteProp({
    spriteURL: this.foundationStickerSpriteURL,
  });

  hintStickerSprite = new SpriteProp({
    spriteURL: this.hintStickerSpriteURL,
  });

  orbitCoordinatesProp = new OrbitCoordinatesProp({
    orbitCoordinatesRequest: this.orbitCoordinatesRequestProp,
    latitudeLimit: this.latitudeLimitProp,
    puzzleID: this.puzzleIDProp,
  });

  puzzleDefProp = new PuzzleDefProp({ puzzle: this.puzzleIDProp });

  visualizationStrategyProp = new VisualizationStrategyProp({
    visualizationRequest: this.visualizationFormatProp,
    puzzleID: this.puzzleIDProp,
  });

  // Depth 2
  indexerConstructorProp = new IndexerConstructorProp({
    alg: this.algProp,
    puzzle: this.puzzleIDProp,
    visualizationStrategy: this.visualizationStrategyProp,
    indexerConstructorRequest: this.indexerConstructorRequestProp,
  });

  puzzleAlgProp = new PuzzleAlgProp({
    algWithIssues: this.algProp,
    puzzleDef: this.puzzleDefProp,
  });

  puzzleSetupProp = new PuzzleAlgProp({
    algWithIssues: this.setupProp,
    puzzleDef: this.puzzleDefProp,
  });

  // Depth 3
  indexerProp = new IndexerProp({
    indexerConstructor: this.indexerConstructorProp,
    algWithIssues: this.puzzleAlgProp,
    def: this.puzzleDefProp,
  });

  setupTransformationProp = new AlgTransformationProp({
    alg: this.puzzleSetupProp,
    def: this.puzzleDefProp,
  });

  // Depth 4
  anchoredStartProp = new AnchoredStartProp({
    setupAnchor: this.setupAnchorProp,
    setupTransformation: this.setupTransformationProp,
    indexer: this.indexerProp,
    def: this.puzzleDefProp,
  });

  timeRangeProp = new TimeRangeProp({
    indexer: this.indexerProp,
  });

  // Depth 5
  detailedTimelineInfoProp: DetailedTimelineInfoProp =
    new DetailedTimelineInfoProp({
      timestampRequest: this.timestampRequestProp,
      timeRange: this.timeRangeProp,
      setupAnchor: this.setupAnchorProp,
    });

  // Depth 6
  currentLeavesProp = new CurrentLeavesProp({
    indexer: this.indexerProp,
    detailedTimelineInfo: this.detailedTimelineInfoProp,
  });

  coarseTimelineInfoProp = new CoarseTimelineInfoProp({
    detailedTimelineInfo: this.detailedTimelineInfoProp,
    playingInfo: this.playingInfoProp,
  });

  // Depth 7
  // TODO: Inline Twisty3D management.
  buttonAppearanceProp = new ButtonAppearanceProp({
    coarseTimelineInfo: this.coarseTimelineInfoProp,
    viewerLink: this.viewerLinkProp,
  });

  currentLeavesSimplifiedProp = new CurrentLeavesSimplifiedProp({
    currentMoveInfo: this.currentLeavesProp,
  });

  // Depth 8
  currentTransformationProp = new CurrentTransformationProp({
    anchoredStart: this.anchoredStartProp,
    currentLeavesSimplified: this.currentLeavesSimplifiedProp,
    indexer: this.indexerProp,
    def: this.puzzleDefProp,
  });

  // Depth 9
  legacyPositionProp = new LegacyPositionProp({
    currentMoveInfo: this.currentLeavesProp,
    transformation: this.currentTransformationProp,
  });

  public async twizzleLink(): Promise<string> {
    const url = new URL("https://alpha.twizzle.net/edit/");

    const [puzzle, alg, setup, anchor] = await Promise.all([
      this.puzzleIDProp.get(),
      this.algProp.get(),
      this.setupProp.get(),
      this.setupAnchorProp.get(),
    ]);

    if (!alg.alg.experimentalIsEmpty()) {
      url.searchParams.set("alg", alg.alg.toString());
    }
    if (!setup.alg.experimentalIsEmpty()) {
      url.searchParams.set("experimental-setup-alg", setup.toString());
    }
    if (anchor !== "start") {
      url.searchParams.set("experimental-setup-anchor", anchor);
    }
    // if (this.experimentalStickering !== "full") {
    //   url.searchParams.set(
    //     "experimental-stickering",
    //     this.experimentalStickering,
    //   );
    if (puzzle !== "3x3x3") {
      url.searchParams.set("puzzle", puzzle);
    }
    return url.toString();
  }
}
