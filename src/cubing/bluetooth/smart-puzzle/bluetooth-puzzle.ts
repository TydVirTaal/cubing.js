import type { Move } from "../../alg";
import type { KState } from "../../kpuzzle/KState";
import { BasicRotationTransformer, StreamTransformer } from "../transformer";

/******** BluetoothPuzzle ********/

// TODO: Use actual `CustomEvent`s?
// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
export interface MoveEvent {
  latestMove: Move;
  timeStamp: number;
  debug?: Record<string, unknown>;
  state?: KState;
  quaternion?: any; // TODO: Unused
}

// TODO: Only use the `quaternion` field in the `MoveEvent`?
export interface OrientationEvent {
  quaternion: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  timeStamp: number;
  debug?: Record<string, unknown>;
}

export interface BluetoothConfig<T> {
  connect: (
    server: BluetoothRemoteGATTServer,
    device?: BluetoothDevice,
  ) => Promise<T>;
  // TODO: Can we reuse `filters`?
  prefixes: string[]; // `[""]` for GiiKER
  filters: BluetoothLEScanFilter[];
  optionalServices: BluetoothServiceUUID[];
}

// TODO: Expose device name (and/or globally unique identifier)?
export abstract class BluetoothPuzzle extends EventTarget {
  public transformers: StreamTransformer[] = [];
  protected listeners: Array<(e: MoveEvent) => void> = []; // TODO: type
  protected orientationListeners: Array<(e: OrientationEvent) => void> = []; // TODO: type

  public abstract name(): string | undefined;
  public abstract disconnect(): void; // TODO: Can we make this reutrn (async) on success?

  // TODO: require subclasses to implement this?
  public async getState(): Promise<KState> {
    throw new Error("cannot get state");
  }

  public addMoveListener(listener: (e: MoveEvent) => void): void {
    this.listeners.push(listener);
  }

  public addOrientationListener(listener: (e: OrientationEvent) => void): void {
    this.orientationListeners.push(listener);
  }

  public experimentalAddBasicRotationTransformer(): void {
    this.transformers.push(new BasicRotationTransformer());
  }

  protected dispatchMove(moveEvent: MoveEvent): void {
    for (const transformer of this.transformers) {
      transformer.transformMove(moveEvent);
    }
    for (const l of this.listeners) {
      l(moveEvent);
    }
  }

  protected dispatchOrientation(orientationEvent: OrientationEvent): void {
    for (const transformer of this.transformers) {
      transformer.transformOrientation(orientationEvent);
    }
    const { x, y, z, w } = orientationEvent.quaternion;
    // TODO: can we avoid mutating the source event?
    orientationEvent.quaternion = {
      x,
      y,
      z,
      w,
    };
    for (const l of this.orientationListeners) {
      // TODO: Convert quaternion.
      l(orientationEvent);
    }
  }
}
