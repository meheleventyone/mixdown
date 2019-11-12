import { GenerationHandle, GenerationalArena } from "./GenerationalArena";
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
    priority: Priority;
    asset: string;
    gain: number;
    loop?: SoundLoop;
    clip?: SoundClip;
    mixer?: string;
}
export interface MusicDefinition {
    kind: "music";
    source: string;
    gain: number;
    mixer?: string;
}
export interface MixerDefinition {
    kind: "mixer";
    name: string;
    gain: number;
}
export interface AssetDefinition {
    kind: "asset";
    source: string;
}
declare type Definable = AssetDefinition | SoundDefinition | MusicDefinition | MixerDefinition;
export declare class Bank {
    assets: AssetDefinition[];
    sounds: SoundDefinition[];
    music: MusicDefinition[];
    mixers: MixerDefinition[];
}
export declare class BankBuilder {
    add(name: string, definition: Definable): void;
    addAssetDefinition(name: string, definition: AssetDefinition): void;
    addSoundDefinition(name: string, definition: SoundDefinition): void;
    addMusicDefinition(name: string, definition: MusicDefinition): void;
    addMixerDefinition(name: string, definition: MixerDefinition): void;
    createAssetDefinition(name: string, source: string): void;
    createSoundDefinition(name: string, priority: Priority, asset: string, gain: number, loop?: SoundLoop, clip?: SoundClip, mixer?: string): void;
    createMusicDefinition(name: string, source: string, gain: number, mixer?: string): void;
    createMixerDefinition(name: string, gain: number): void;
}
export declare type Playable = SoundDefinition | MusicDefinition;
export declare enum OperationResult {
    SUCCESS = 0,
    DOES_NOT_EXIST = 1
}
interface Voice {
    gain: GainNode;
    balance: StereoPannerNode;
    source: AudioBufferSourceNode;
    priority: Priority;
    playOut: boolean;
}
interface Stream {
    gain: GainNode;
    balance: StereoPannerNode;
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
    assetMap: Record<string, AudioBuffer | undefined>;
    maxSounds: number;
    slopSize: number;
    mixerMap: Record<string, Mixer | undefined>;
    masterMixer: Mixer;
    voices: GenerationalArena<Voice>;
    streams: GenerationalArena<Stream>;
    removalFadeDuration: number;
    constructor(maxSounds?: number, maxStreams?: number, slopSize?: number);
    suspend(): void;
    resume(): void;
    createMixer(name: string, parentTo?: Mixer): Mixer | undefined;
    addMixer(mixer: Mixer): boolean;
    getMixer(name: string): Mixer | undefined;
    play(playable: Playable, optionalMixer?: string): VoiceGenerationHandle | StreamGenerationHandle | undefined;
    playSound(sound: SoundDefinition, optionalMixer?: string): VoiceGenerationHandle | undefined;
    playMusic(music: MusicDefinition, optionalMixer?: string): StreamGenerationHandle | undefined;
    stop(index: VoiceGenerationHandle | StreamGenerationHandle): OperationResult;
    stopSound(index: VoiceGenerationHandle): OperationResult;
    stopMusic(index: StreamGenerationHandle): OperationResult;
    loop(index: VoiceGenerationHandle, start?: number, end?: number): OperationResult;
    stopLoop(index: VoiceGenerationHandle): OperationResult;
    fadeTo(index: VoiceGenerationHandle | StreamGenerationHandle, value: number, duration: number): OperationResult;
    fadeOut(index: VoiceGenerationHandle | StreamGenerationHandle, duration: number): OperationResult;
    gain(index: VoiceGenerationHandle | StreamGenerationHandle, value: number): OperationResult;
    balance(index: VoiceGenerationHandle | StreamGenerationHandle, value: number): OperationResult;
    loadAsset(name: string, path: string): Promise<boolean>;
    numFreeSlots(): number;
    getBuffer(assetName: string): AudioBuffer | undefined;
    isPlaying(index: VoiceGenerationHandle | StreamGenerationHandle): boolean;
    private getElement;
    private voiceEnded;
    private evictVoice;
}
export {};
