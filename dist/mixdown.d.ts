/**
 * A [[GenerationalArena]] is a fixed size pool of values of type T. Access is controlled via
 * [[GenerationHandle|Generation Handles]]. These are valid so long as the element they point to
 *  has not been replaced since it was issued. T
 *
 * This is useful to prevent accidental access and modification of elements that have changed by a stale index.
 * This allows handles to be kept with a guarentee that if the element has changed it cannot be accessed by an older
 * handle pointing to the same element. In effect weakly referencing values stored in the arena.
 *
 * A GenerationHandle holds two readonly numbers. The first is the index into the [[GernerationalArena]].
 * The second is the generation of element pointed to when the handle was generated.
 *
 * The main point of note is that these values should not be modified after they have been handed out. Nor should
 * users create these themselves. Nor should they pass handles from one arena into a different arena.
 *
 * For safety it can be a good idea to extend GenerationalHandle:
 * ```typescript
 * export class SpecificHandle extends GenerationHandle {
 *      constructor (index : number, generation : number) {
 *          super(index, generation);
 *      }
 * }
 * ```
 *
 * And then extend GenerationalArena:
 * ```typescript
 * class SpecificGenerationalArena<T> extends GenerationalArena<T, SpecificHandle> {
 *      constructor(size : number) {
 *          super(size, SpecificHandle);
 *      }
 * }
 * ```
 *
 * This results in an arena that can only take the SpecificHandle type as a valid handle.
 *
 * @packageDocumentation
 */
declare class GenerationHandle {
    readonly index: number;
    readonly generation: number;
    constructor(index: number, generation: number);
}
declare class GenerationalArena<T, E extends GenerationHandle> {
    generation: number[];
    data: (T | undefined)[];
    freeList: number[];
    handleConstructor: new (index: number, generation: number) => E;
    constructor(size: number, handleConstructor: new (index: number, generation: number) => E);
    add(data: T): E | undefined;
    get(handle: E): T | undefined;
    findFirst(test: (data: T) => boolean): T | undefined;
    remove(handle: E): undefined;
    valid(handle: E): boolean;
    numFreeSlots(): number;
    numUsedSlots(): number;
}

/**
 *  Value<T> is a part of the Result<T, E> discriminated union, it represents a valid value of T being returned.
 *  @typeParam T The type of the value that will be contained in Value<T>.
 */
interface Value<T> {
    kind: "value";
    value: T;
}
/**
 *  Error<T> is a part of the Result<T, E> discriminated union, it represents an error of T being returned.
 *  @typeParam T The type of the error that will be contained in Error<T>.
 */
interface Error<T> {
    kind: "error";
    error: T;
}
/**
 * A Result type representing a discriminated union of a successful value being returned from a function or an error.
 *
 * Checking for value or error:
 * ```typescript
 * const result = someFunctionThatReturnsResult();
 * if (result.kind === "value") {
 *      // can use result.value
 * } else {
 *      // can use result.error
 * }
 * ```
 * @typeParam T The type of the value to be returned.
 * @typeParam E The type of the error to be returned in the event that the function fails.
 */
declare type Result<T, E> = Value<T> | Error<E>;
/**
 * An Optional type representing a value that may or may not be set.
 *
 * Simple to check for a valid value:
 * ```typescript
 * if (optionalValue !== undefined) {
 *      // do something
 * }
 * ```
 *
 * @typeParam T the type of the value if set.
 */
declare type Optional<T> = T | undefined;

/**
 * A set of utility functions and classes to help work around deficiencies in the Safari WebAudio implementation.
 * @packageDocumentation
 */
/**
 * Part of the [[MixdownStereoPannerNode]] discriminated union.
 *
 * This is for the Safari implementation using the WebAudio PannerNode.
 */
interface SafariNode {
    kind: "safari";
    panner: PannerNode;
}
/**
 * Part of the [[MixdownStereoPannerNode]] discriminated union.
 *
 * This is for all non-Safari implementations using the WebAudio StereoPannerNode.
 */
interface StereoNode {
    kind: "stereopanner";
    stereoPanner: StereoPannerNode;
}
/**
 * A discriminated union representing the different implementations of the [[MixdownStereoPanner]]
 */
declare type MixdownStereoPannerNode = SafariNode | StereoNode;
/**
 * MixdownStereoPanner is a wrapper over the cross-platform implementation details of StereoPannerNode.
 *
 * On Safari it represents the StereoPannerNode using the PannerNode using the 'equalpower' model.
 * To correctly pan the sound it is moved along the x-axis between -1 and 1 from left to right.
 * To keep the loudness equivalent for all positions as you would expect in purely stereo output the
 *  distance is kept at 1 unit by offsetting the sound forward along the z-axis by 1 - abs(panValue).
 *
 * On other platforms it uses the standard StereoPannerNode.
 *
 * Note: On Safari this is probably not going to mix well with anything that moves
 * the listener position around, at that point we would need to adjust all
 * MixdownStereoPanner nodes to be offset from that position
 */
declare class MixdownStereoPanner {
    /**
     * @ignore
     * */
    _panner: MixdownStereoPannerNode;
    /**
      * @ignore
      * */
    _pan: number;
    /**
     *  @returns The current value of the pan property.
     */
    get pan(): number;
    /**
     * @param value The value to set pan to in the underlying implementation. This is clamped in the range -1 to 1 inclusive.
     */
    set pan(value: number);
    /**
     *
     * @param context The AudioContext that [[Mixdown]] is using.
     */
    constructor(context: AudioContext);
    /**
     * @returns A reference to the AudioNode being used by the underlying implementation.
     */
    getAudioNode(): AudioNode;
}

declare enum Priority {
    Low = 0,
    Medium = 1,
    High = 2
}
interface SoundLoop {
    playIn: boolean;
    playOut: boolean;
}
interface SoundClip {
    start: number;
    end: number;
}
interface SoundDefinition {
    kind: "sound";
    name: string;
    priority: Priority;
    asset: string;
    gain: number;
    loop?: SoundLoop;
    clip?: SoundClip;
    mixer?: string;
}
interface StreamDefinition {
    kind: "stream";
    name: string;
    source: string;
    gain: number;
    mixer?: string;
}
interface MixerDefinition {
    kind: "mixer";
    name: string;
    gain: number;
    parent?: string;
}
interface AssetDefinition {
    kind: "asset";
    name: string;
    source: string;
}
declare type Definable = AssetDefinition | SoundDefinition | StreamDefinition | MixerDefinition;
declare class Bank {
    assets: AssetDefinition[];
    sounds: SoundDefinition[];
    streams: StreamDefinition[];
    mixers: MixerDefinition[];
    get(name: string): Definable | undefined;
    getAssetDefinition(name: string): AssetDefinition | undefined;
    getSoundDefinition(name: string): SoundDefinition | undefined;
    getStreamDefinition(name: string): StreamDefinition | undefined;
    getMixerDefinition(name: string): MixerDefinition | undefined;
}
declare class BankBuilder {
    bank: Bank;
    constructor();
    private getBank;
    add(definition: Definable): void;
    createAssetDefinition(name: string, source: string): void;
    createSoundDefinition(name: string, priority: Priority, asset: string, gain: number, loop?: SoundLoop, clip?: SoundClip, mixer?: string): void;
    createStreamDefinition(name: string, source: string, gain: number, mixer?: string): void;
    createMixerDefinition(name: string, gain: number, parent?: string): void;
    validate(): boolean;
}
declare type Playable = SoundDefinition | StreamDefinition;
declare enum LoadBankError {
    BANK_VALIDATION_FAIL = 0
}
declare enum OperationResult {
    SUCCESS = 0,
    DOES_NOT_EXIST = 1
}
interface Voice {
    gain: GainNode;
    balance: MixdownStereoPanner;
    source: AudioBufferSourceNode;
    priority: Priority;
    playOut: boolean;
}
interface Stream {
    gain: GainNode;
    balance: MixdownStereoPanner;
    source: MediaElementAudioSourceNode;
    audio: HTMLAudioElement;
}
declare class VoiceGenerationHandle extends GenerationHandle {
    kind: "voice";
    constructor(index: number, generation: number);
}
declare class StreamGenerationHandle extends GenerationHandle {
    kind: "stream";
    constructor(index: number, generation: number);
}
declare class Mixer {
    context: AudioContext;
    gainNode: GainNode;
    parent: Mixer | undefined;
    name: string;
    constructor(context: AudioContext, name: string, parent?: Mixer | Mixdown);
    connect(to: Mixer | Mixdown): void;
    disconnect(): void;
    gain(value: number): void;
    fadeTo(value: number, duration: number): void;
    fadeOut(duration: number): void;
}
declare class Mixdown {
    context: AudioContext;
    bank: Bank | undefined;
    assetMap: Record<string, AudioBuffer | undefined>;
    maxSounds: number;
    slopSize: number;
    mixerMap: Record<string, Mixer | undefined>;
    masterMixer: Mixer;
    voices: GenerationalArena<Voice, VoiceGenerationHandle>;
    streams: GenerationalArena<Stream, StreamGenerationHandle>;
    removalFadeDuration: number;
    constructor(maxSounds?: number, maxStreams?: number, slopSize?: number);
    loadAsset(name: string, path: string): Promise<boolean>;
    unloadBank(): void;
    loadBank(builder: BankBuilder): Result<Promise<boolean[]>, LoadBankError>;
    suspend(): void;
    resume(): void;
    addMixer(mixer: Mixer): boolean;
    getMixer(name: string): Optional<Mixer>;
    getSoundDef(name: string): Optional<SoundDefinition>;
    getStreamDef(name: string): Optional<StreamDefinition>;
    play(name: string, optionalMixer?: string): Optional<VoiceGenerationHandle | StreamGenerationHandle>;
    playSound(name: string, optionalMixer?: string): Optional<VoiceGenerationHandle>;
    playStream(name: string, optionalMixer?: string): Optional<StreamGenerationHandle>;
    playPlayable(playable: Playable, optionalMixer?: string): Optional<VoiceGenerationHandle | StreamGenerationHandle>;
    playSoundDef(sound: SoundDefinition, optionalMixer?: string): Optional<VoiceGenerationHandle>;
    playStreamDef(stream: StreamDefinition, optionalMixer?: string): Optional<StreamGenerationHandle>;
    stopAll(): void;
    stop(handle: VoiceGenerationHandle | StreamGenerationHandle): OperationResult;
    stopSound(handle: VoiceGenerationHandle): OperationResult;
    stopStream(handle: StreamGenerationHandle): OperationResult;
    loop(handle: VoiceGenerationHandle, start?: number, end?: number): OperationResult;
    stopLoop(handle: VoiceGenerationHandle): OperationResult;
    fadeTo(handle: VoiceGenerationHandle | StreamGenerationHandle, value: number, duration: number): OperationResult;
    fadeOut(handle: VoiceGenerationHandle | StreamGenerationHandle, duration: number): OperationResult;
    fadeOutAndRemove(handle: VoiceGenerationHandle | StreamGenerationHandle, duration: number): OperationResult;
    gain(handle: VoiceGenerationHandle | StreamGenerationHandle, value: number): OperationResult;
    balance(handle: VoiceGenerationHandle | StreamGenerationHandle, value: number): OperationResult;
    numFreeSlots(): number;
    getBuffer(assetName: string): AudioBuffer | undefined;
    isPlaying(handle: VoiceGenerationHandle | StreamGenerationHandle): boolean;
    private createStereoPanner;
    private getElement;
    private voiceEnded;
    private evictVoice;
}

export { AssetDefinition, Bank, BankBuilder, LoadBankError, Mixdown, Mixer, MixerDefinition, OperationResult, Playable, Priority, SoundClip, SoundDefinition, SoundLoop, StreamDefinition, StreamGenerationHandle, VoiceGenerationHandle };
