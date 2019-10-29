import { GenerationHandle, GenerationalArena } from "./GenerationalArena";
export declare enum Priority {
    Low = 0,
    Medium = 1,
    High = 2
}
export interface SoundLoop {
    start: number;
    end: number;
}
export interface SoundClip {
    start: number;
    end: number;
}
export interface Sound {
    kind: "sound";
    priority: Priority;
    asset: string;
    gain: number;
    loop?: SoundLoop;
    clip?: SoundClip;
}
export interface Music {
    kind: "music";
    source: string;
    gain: number;
}
export declare type Playable = Sound | Music;
export declare enum OperationResult {
    SUCCESS = 0,
    DOES_NOT_EXIST = 1
}
interface Voice {
    gain: GainNode;
    balance: StereoPannerNode;
    source: AudioBufferSourceNode;
    priority: Priority;
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
export declare class Mixdown {
    context: AudioContext;
    assetMap: Record<string, AudioBuffer>;
    maxSounds: number;
    slopSize: number;
    masterGain: GainNode;
    voices: GenerationalArena<Voice>;
    streams: GenerationalArena<Stream>;
    removalFadeDuration: number;
    constructor(maxSounds?: number, maxStreams?: number, slopSize?: number);
    suspend(): void;
    resume(): void;
    play(playable: Playable): VoiceGenerationHandle | StreamGenerationHandle | undefined;
    playSound(sound: Sound): VoiceGenerationHandle | undefined;
    playMusic(music: Music): StreamGenerationHandle | undefined;
    stop(index: VoiceGenerationHandle | StreamGenerationHandle): OperationResult;
    stopSound(index: VoiceGenerationHandle): OperationResult;
    stopMusic(index: StreamGenerationHandle): OperationResult;
    loop(index: VoiceGenerationHandle, start?: number, end?: number): OperationResult;
    stopLoop(index: VoiceGenerationHandle): OperationResult;
    fadeTo(index: VoiceGenerationHandle | StreamGenerationHandle, value: number, duration: number): OperationResult;
    fadeOut(index: VoiceGenerationHandle | StreamGenerationHandle, duration: number): OperationResult;
    gain(index: VoiceGenerationHandle | StreamGenerationHandle, value: number): OperationResult;
    balance(index: VoiceGenerationHandle | StreamGenerationHandle, value: number): OperationResult;
    loadAsset(name: string, path: string): void;
    numFreeSlots(): number;
    private voiceEnded;
    private evictVoice;
}
export {};
