/**
 * A [[GenerationalArena]] is a fixed size pool of values of type T. Access is controlled via
 * [[GenerationHandle|Generation Handles]]. These are valid so long as the element they point to
 *  has not been replaced since it was issued.
 *
 * This is useful to prevent accidental access and modification of elements that have changed by a stale index.
 * This allows handles to be kept with a guarentee that if the element has changed it cannot be accessed by an older
 * handle pointing to the same element. In effect weakly referencing values stored in the arena.
 *
 * A GenerationHandle holds two readonly numbers. The first is the index into the [[GernerationalArena]].
 * The second is the generation of element pointed to when the handle was generated.
 *
 * The main points of note is that these values should not be modified after they have been handed out. Nor should
 * users create these themselves. Nor should they pass handles from one arena into a different arena. Further data references
 * taken from the Arena should be treated as ephemeral and not stored elsewhere.
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
 * For convenience there exists [[SimpleGenerationalArena]] that provides this behavior for [[GenerationHandle]].
 *
 * @packageDocumentation
 */
/**
 * GenerationalHandle stores readonly values representing an index into the [[GenerationalArena]] and the generation
 * that it is valid for.
 */
declare class GenerationHandle {
    readonly index: number;
    readonly generation: number;
    constructor(index: number, generation: number);
}
/**
 * GenerationalArena stores a number of items of type T that can be accessed through a handle of type H.
 *
 * Access via handles is policed such that handles to removed values are considered invalid.
 *
 * Data accessed via a handle should not be retained and should be treated as ephemeral.
 */
declare class GenerationalArena<T, H extends GenerationHandle> {
    generation: number[];
    data: (T | undefined)[];
    freeList: number[];
    handleConstructor: new (index: number, generation: number) => H;
    /**
     * Constructs a GenerationalArena.
     * @param size The number of items contained in the arena.
     * @param handleConstructor The constructor function for the handle (e.g. if H if GenerationalArena then pass in GenerationalArena).
     */
    constructor(size: number, handleConstructor: new (index: number, generation: number) => H);
    /**
     * Adds an item of type T to the arena.
     * @param data The data to add.
     * @returns A handle of type H if the operation was successful or undefined if it failed.
     */
    add(data: T): H | undefined;
    /**
     * Returns the data represented by the handle passed in. This should not be retained and treated
     * as ephemeral.
     * @param handle The handle to retrieve data for.
     * @returns Either the data or undefined if the handle is now invalid.
     */
    get(handle: H): T | undefined;
    /**
     * Returns the first piece of data that meets the criteria specified by test.
     * @param test The function to test against.
     * @returns The data found or undefined. TODO: This should return a handle.
     */
    findFirst(test: (data: T) => boolean): T | undefined;
    /**
     * Removes the data pointed to by handle.
     * @param handle The handle to remove.
     */
    remove(handle: H): undefined;
    /**
     * Tests a handle to see if it is still valid.
     * @param handle The handle to test.
     * @returns True if valid, false otherwise.
     */
    valid(handle: H): boolean;
    /**
     * @returns The number of free slots remaining.
     */
    numFreeSlots(): number;
    /**
     * @returns The number of slots used.
     */
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

/**
 * The priority of the [[SoundDefinition]]. Higher priority sounds will replace lower priority sounds.
 */
declare enum Priority {
    Low = 0,
    Medium = 1,
    High = 2
}
/**
 * Metadata for sound looping. If set to play in the sound will play the part of sound before the loop start
 *  point and then loop. If set to play out when the sound is stopped it will play the part of the sound
 * after the loop end point before it was stopped.
 */
interface SoundLoop {
    playIn: boolean;
    playOut: boolean;
}
/**
 * Sets the start and end points in seconds to define a sound clip. SoundClip is used for loops and one shot clips.
 */
interface SoundClip {
    start: number;
    end: number;
}
/**
 * A SoundDefinition is the definition for sounds that should be played from assets loaded
 * into memory from [[AssetDefinition]]s.
 *
 * Each SoundDefinition is defined as:
 * * __name__ - A string by which the definition can later be referred.
 * * __priority__ - A [[Priority]] for the sound.
 * * __asset__ - The string name of an [[AssetDefinition]].
 * * __gain__ - The default gain to be set to play this SoundDefinition.
 * * __loop__ - A [[SoundLoop]]. An optional piece of metadata to define how looping will behave.
 * * __clip__ - A [[SoundClip]]. An optional piece of metadata that defines start and end points for the clip or loop.
 * * __mixer__ - The string name of an optional [[MixerDefinition]] to play this sound through. This means the sound
 * will play through the specified [[Mixer]].
 */
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
/**
 * A StreamDefinition defines sounds that should be streamed rather than loaded into memory. This trades some immediecy
 * of playback for lower memory overhead and is most useful for playing music and other long running sounds.
 *
 * Each StreamDefinition contains:
 * * __name__ - A string by which the definition can later be referred.
 * * __source__ - The source URL from which the streaming audio will be played.
 * * __gain__ - The starting gain for the audio.
 * * __mixer__ - The string name of an optional [[MixerDefinition]] to play this sound through. This means the sound will
 * be piped through the specified [[Mixer]].
 */
interface StreamDefinition {
    kind: "stream";
    name: string;
    source: string;
    gain: number;
    mixer?: string;
}
/**
 * A MixerDefinition defines a [[Mixer]] which is a node based means of manipulating sounds as groups. Multiple Mixers and
 * sounds can be piped through a Mixer which in turn can pipe itself to another Mixer.
 *
 * Each MixerDefinition contains:
 * * __name__ - A string by which the [[Mixer]] can later be referred.
 * * __gain__ - The starting gain of the Mixer.
 * * __parent__ - An optional string name of the [[Mixer]] to which this definition should be parented.
 */
interface MixerDefinition {
    kind: "mixer";
    name: string;
    gain: number;
    parent?: string;
}
/**
 * An AssetDefinition defines an asset that will be loaded into memory.
 *
 * Each AssetDefinition contains:
 * * __name__ - A string by which the AssetDefinition can later be referred.
 * * __source__ - A URL to the asset to be loaded.
 */
interface AssetDefinition {
    kind: "asset";
    name: string;
    source: string;
}
/**
 * A Definable is the union of the different definition types.
 */
declare type Definable = AssetDefinition | SoundDefinition | StreamDefinition | MixerDefinition;
/**
 * A Bank contains a collection of [[Definable]] items that constitute a set of sounds and mixers that belong together.
 *
 * Typically you don't want to create one yourself but rather use the [[BankBuilder]].
 */
declare class Bank {
    assets: AssetDefinition[];
    sounds: SoundDefinition[];
    streams: StreamDefinition[];
    mixers: MixerDefinition[];
    /**
     * Finds a [[Definable]] by name if you know the type of the item it's faster to use the specific accessor.
     * @param name The name of the [[Definable]] to find.
     * @returns The [[Definable]] or undefined if the name does not exist in the bank.
     */
    get(name: string): Definable | undefined;
    /**
     * Finds an [[AssetDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[AssetDefinition]] or undefined if the name does not exist in the bank.
     */
    getAssetDefinition(name: string): AssetDefinition | undefined;
    /**
     * Finds a [[SoundDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[SoundDefinition]] or undefined if the name does not exist in the bank.
     */
    getSoundDefinition(name: string): SoundDefinition | undefined;
    /**
     * Finds a [[StreamDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[StreamDefinition]] or undefined if the name does not exist in the bank.
     */
    getStreamDefinition(name: string): StreamDefinition | undefined;
    /**
     * Finds a [[MixerDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[MixerDefinition]] or undefined if the name does not exist in the bank.
     */
    getMixerDefinition(name: string): MixerDefinition | undefined;
}
/**
 * The BankBuilder is used to create a [[Bank]] in a declarative manner.
 */
declare class BankBuilder {
    /** The Bank to be manipulated. */
    bank: Bank;
    constructor();
    private getBank;
    /**
     * Add's a [[Definable]] to the [[Bank]].
     * @param definition The [[Definable]] to add.
     */
    add(definition: Definable): void;
    /**
     * Creates an [[AssetDefinition]] and adds it to the [[Bank]].
     * @param name A string by which the [[AssetDefinition]] can later be referred.
     * @param source A URL from which the asset will be loaded.
     */
    createAssetDefinition(name: string, source: string): void;
    /**
     * Creates a [[SoundDefinition]] and adds it to the [[Bank]].
     * @param name A string by which the [[SoundDefinition]] can later be referred.
     * @param priority A [[Priority]] for the sound.
     * @param asset The name of the [[AssetDefinition]] that is used by this sound.
     * @param gain The starting gain of this sound.
     * @param loop Optional [[SoundLoop]] metadata.
     * @param clip Optional [[SoundClip]] metadata.
     * @param mixer Optional name of a [[Mixer]] this sound should play through.
     */
    createSoundDefinition(name: string, priority: Priority, asset: string, gain: number, loop?: SoundLoop, clip?: SoundClip, mixer?: string): void;
    /**
     * Creates a [[StreamDefinition]] and adds it to the [[Bank]]
     * @param name A string by which this [[StreamDefinition]] may later be referred.
     * @param source The URL the sound will be streamed from.
     * @param gain The starting gain value.
     * @param mixer Optional name of the [[Mixer]] this sound will be played through.
     */
    createStreamDefinition(name: string, source: string, gain: number, mixer?: string): void;
    /**
     * Creates a [[MixerDefinition]] and adds it to the [[Bank]].
     * @param name A string by which this [[MixerDefinition]] may later be referred.
     * @param gain The starting gain value for the [[Mixer]].
     * @param parent Optional name of the parent Mixer for this instance.
     */
    createMixerDefinition(name: string, gain: number, parent?: string): void;
    /**
     * This function allows the user to make sure a [[Bank]] meets the requirements of [[Mixdown]].
     */
    static validate(bank: Bank): boolean;
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
    loadBank(bank: Bank): Result<Promise<boolean[]>, LoadBankError>;
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
