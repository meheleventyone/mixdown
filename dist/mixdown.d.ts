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
interface Definition {
    name: string;
}
interface SoundDefinition extends Definition {
    kind: "sound";
    priority: Priority;
    asset: string;
    gain: number;
    loop?: SoundLoop;
    clip?: SoundClip;
    mixer?: string;
}
interface MusicDefinition extends Definition {
    kind: "music";
    source: string;
    gain: number;
    mixer?: string;
}
interface MixerDefinition extends Definition {
    kind: "mixer";
    name: string;
    parent: string;
    gain: number;
}
interface AssetDefinition extends Definition {
    kind: "asset";
    source: string;
}
declare type Definable = AssetDefinition | SoundDefinition | MusicDefinition | MixerDefinition;
declare class Bank {
    assets: AssetDefinition[];
    sounds: SoundDefinition[];
    music: MusicDefinition[];
    mixers: MixerDefinition[];
    get(name: string): Definable | undefined;
    getAssetDefinition(name: string): AssetDefinition | undefined;
    getSoundDefinition(name: string): SoundDefinition | undefined;
    getMusicDefinition(name: string): MusicDefinition | undefined;
    getMixerDefinition(name: string): MixerDefinition | undefined;
}
declare class BankBuilder {
    bank: Bank;
    constructor();
    private getBank;
    add(definition: Definable): void;
    createAssetDefinition(name: string, source: string): void;
    createSoundDefinition(name: string, priority: Priority, asset: string, gain: number, loop?: SoundLoop, clip?: SoundClip, mixer?: string): void;
    createMusicDefinition(name: string, source: string, gain: number, mixer?: string): void;
    createMixerDefinition(name: string, gain: number, parent?: string): void;
    validate(): boolean;
}
declare type Playable = SoundDefinition | MusicDefinition;
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
    loadBank(builder: BankBuilder): void;
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

export { AssetDefinition, Bank, BankBuilder, Mixdown, Mixer, MixerDefinition, MusicDefinition, OperationResult, Playable, Priority, SoundClip, SoundDefinition, SoundLoop, StreamGenerationHandle, VoiceGenerationHandle };
