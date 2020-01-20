import { GenerationHandle, GenerationalArena } from "./GenerationalArena";
import { Result, Optional } from "./Utility";
import { MixdownStereoPanner } from "./SafariHacks";
export declare enum Priority {
    Low = 0,
    Medium = 1,
    High = 2
}
export interface SoundLoop {
    playIn: boolean;
    playOut: boolean;
}
export interface SoundClip {
    start: number;
    end: number;
}
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
export interface StreamDefinition {
    kind: "stream";
    name: string;
    source: string;
    gain: number;
    mixer?: string;
}
export interface MixerDefinition {
    kind: "mixer";
    name: string;
    gain: number;
    parent?: string;
}
export interface AssetDefinition {
    kind: "asset";
    name: string;
    source: string;
}
declare type Definable = AssetDefinition | SoundDefinition | StreamDefinition | MixerDefinition;
export declare class Bank {
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
export declare class BankBuilder {
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
export declare type VoiceGenerationHandle = {
    kind: "voice";
} & GenerationHandle;
export declare type StreamGenerationHandle = {
    kind: "stream";
} & GenerationHandle;
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
    voices: GenerationalArena<Voice>;
    streams: GenerationalArena<Stream>;
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
export {};
