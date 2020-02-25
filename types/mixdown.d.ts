/**
 * A Web Audio based mixer for games.
 * @packageDocumentation
 */
import { GenerationHandle, GenerationalArena } from "./GenerationalArena";
import { Result, Optional } from "./Utility";
import { MixdownStereoPanner } from "./SafariHacks";
/**
 * The priority of the [[SoundDefinition]]. Higher priority sounds will replace lower priority sounds.
 */
export declare enum Priority {
    Low = 0,
    Medium = 1,
    High = 2
}
/**
 * Metadata for sound looping. If set to play in the sound will play the part of sound before the loop start
 *  point and then loop. If set to play out when the sound is stopped it will play the part of the sound
 * after the loop end point before it was stopped.
 */
export interface SoundLoop {
    playIn: boolean;
    playOut: boolean;
}
/**
 * Sets the start and end points in seconds to define a sound clip. SoundClip is used for loops and one shot clips.
 */
export interface SoundClip {
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
export interface SoundDefinition {
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
export interface StreamDefinition {
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
export interface MixerDefinition {
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
export interface AssetDefinition {
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
export declare class Bank {
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
export declare class BankBuilder {
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
export declare type Playable = SoundDefinition | StreamDefinition;
export declare enum LoadBankError {
    BANK_VALIDATION_FAIL = 0
}
export declare enum OperationResult {
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
export declare class VoiceGenerationHandle extends GenerationHandle {
    kind: "voice";
    constructor(index: number, generation: number);
}
export declare class StreamGenerationHandle extends GenerationHandle {
    kind: "stream";
    constructor(index: number, generation: number);
}
export declare class Mixer {
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
export declare class Mixdown {
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
export {};
