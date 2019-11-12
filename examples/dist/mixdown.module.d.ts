interface GenerationHandle {
    readonly index: number;
    readonly generation: number;
}
declare class GenerationalArena<T> {
    generation: number[];
    data: (T | undefined)[];
    freeList: number[];
    constructor(size: number);
    add(data: T): GenerationHandle | undefined;
    get(handle: GenerationHandle): T | undefined;
    findFirst(test: (data: T) => boolean): T | undefined;
    remove(handle: GenerationHandle): undefined;
    valid(handle: GenerationHandle): boolean;
    numFreeSlots(): number;
    numUsedSlots(): number;
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
interface Sound {
    kind: "sound";
    priority: Priority;
    asset: string;
    gain: number;
    loop?: SoundLoop;
    clip?: SoundClip;
    mixer?: string;
}
interface Music {
    kind: "music";
    source: string;
    gain: number;
    mixer?: string;
}
declare type Playable = Sound | Music;
declare enum OperationResult {
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
declare type VoiceGenerationHandle = {
    kind: "voice";
} & GenerationHandle;
declare type StreamGenerationHandle = {
    kind: "stream";
} & GenerationHandle;
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
    loadAsset(name: string, path: string): Promise<boolean>;
    numFreeSlots(): number;
    getBuffer(assetName: string): AudioBuffer | undefined;
    isPlaying(index: VoiceGenerationHandle | StreamGenerationHandle): boolean;
    private getElement;
    private voiceEnded;
    private evictVoice;
}

export { Mixdown, Mixer, Music, OperationResult, Playable, Priority, Sound, SoundClip, SoundLoop, StreamGenerationHandle, VoiceGenerationHandle };
