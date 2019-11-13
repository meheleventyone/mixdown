// A Web Audio based mixer for games.

import {GenerationHandle, GenerationalArena} from "./GenerationalArena";

// definitions

export enum Priority {
    Low = 0,
    Medium,
    High
}

export interface SoundLoop {
    playIn : boolean;
    playOut : boolean;
}

export interface SoundClip {
    start : number;
    end : number;
}

interface Definition {
    name : string;
}

export interface SoundDefinition extends Definition {
    kind : "sound";
    priority : Priority;
    asset : string;
    gain : number;
    loop? : SoundLoop;
    clip? : SoundClip;
    mixer? : string;
}

export interface MusicDefinition extends Definition {
    kind : "music";
    source : string;
    gain : number;
    mixer? : string;
}

export interface MixerDefinition extends Definition {
    kind : "mixer";
    name : string;
    gain : number;
}

export interface AssetDefinition extends Definition {
    kind : "asset";
    source : string;
}

type Definable = AssetDefinition | SoundDefinition | MusicDefinition | MixerDefinition;

// todo: can this be purely internal, I think so but lets see
export class Bank {
    assets : AssetDefinition[] = [];
    sounds : SoundDefinition[] = [];
    music  : MusicDefinition[] = [];
    mixers : MixerDefinition[] = [];

    get(name : string) : Definable | undefined {

    }

    getAssetDefinition (name : string) : AssetDefinition | undefined {

    }

    getSoundDefinition (name : string) : SoundDefinition | undefined {
        
    }

    getMusicDefinition (name : string) : MusicDefinition | undefined {
        
    }

    getMixerDefinition (name : string) : MixerDefinition | undefined {
        
    }
}

export class BankBuilder {
    bank : Bank;

    constructor () {
        this.bank = new Bank();
    }

    private getBank(definition : Definable) : Definable[] | undefined {
        switch(definition.kind) {
            case "asset":
                return this.bank.assets;
            case "mixer":
                return this.bank.mixers;
            case "music":
                return this.bank.music;
            case "sound":
                return this.bank.sounds;
        }
    }

    add(definition : Definable) {
        var definitionStore = this.getBank(definition);
        var index = definitionStore?.findIndex((item) => item.name === definition.name);
        if (index !== -1) {
            console.warn("Attempting to add existing name {} as a {}.", definition.name, definition.kind);
            return;
        }
        definitionStore?.push(definition);
    }

    createAssetDefinition (name : string, source : string) {
        const asset : AssetDefinition = {kind: "asset", name: name, source: source};
        this.add(asset);
    }

    createSoundDefinition (name : string, priority : Priority, asset : string, gain : number, loop? : SoundLoop, clip? : SoundClip, mixer? : string) {
        const sound : SoundDefinition = {
            kind: "sound",
            name: name,
            priority : priority,
            asset : asset,
            gain : gain,
            loop : loop,
            clip : clip,
            mixer : mixer
        };
        this.add(sound);
    }

    createMusicDefinition (name : string, source : string, gain : number, mixer? : string) {
        const music : MusicDefinition = {
            kind : "music",
            name : name,
            source : source,
            gain : gain,
            mixer : mixer
        };
        this.add(music);
    }

    createMixerDefinition (name : string, gain : number) {
        const mixer : MixerDefinition = {
            kind : "mixer",
            name : name,
            gain : gain
        }
        this.add(mixer);
    }
}

// runtime

export type Playable = SoundDefinition | MusicDefinition;

export enum OperationResult {
    SUCCESS = 0,
    DOES_NOT_EXIST,
}

interface Voice {
    gain : GainNode;
    balance : StereoPannerNode;
    source : AudioBufferSourceNode;
    priority : Priority;
    playOut : boolean;
}

interface Stream {
    gain: GainNode;
    balance: StereoPannerNode;
    source: MediaElementAudioSourceNode;
    audio: HTMLAudioElement;
}

export type VoiceGenerationHandle = {kind : "voice"} & GenerationHandle;
export type StreamGenerationHandle = {kind : "stream"} & GenerationHandle;

export class Mixer {
    context : AudioContext;
    gainNode : GainNode;
    parent : Mixer | undefined;
    name : string;

    constructor(context : AudioContext, name : string, parent? : Mixer | Mixdown) {
        this.context = context;
        this.gainNode = context.createGain();
        this.name = name;
        if (parent) {
            this.connect(parent);
        }
    }

    connect(to : Mixer | Mixdown) {
        if (to instanceof Mixdown) {
            to.masterMixer.connect(this);
            return;
        }

        this.gainNode.connect(to.gainNode);
    }

    disconnect() {
        this.gainNode.disconnect();
    }

    gain(value : number) {
        this.gainNode.gain.setValueAtTime(value, this.context.currentTime);
    }

    fadeTo(value : number, duration : number) {
        // ramp dislikes stuff in the range of ±1.40130e-45, at least in chrome
        if (value < 1.40130e-45) {
            value = 0.001;
        }
        this.gainNode.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
    }

    fadeOut(duration : number) {
        this.fadeTo(0, duration);
    }
}

export class Mixdown {
    context : AudioContext = new AudioContext();

    assetMap : Record<string, AudioBuffer | undefined> = {};

    maxSounds : number;
    slopSize : number;

    mixerMap : Record<string, Mixer | undefined> = {};
    masterMixer : Mixer;

    voices : GenerationalArena<Voice>;
    streams : GenerationalArena<Stream>;
    removalFadeDuration : number = 0.2;

    constructor(maxSounds : number = 32, maxStreams = 2, slopSize : number = 4) {
        this.maxSounds = maxSounds;
        this.slopSize = slopSize;

        this.masterMixer = new Mixer(this.context, "master");
        this.masterMixer.gainNode.connect(this.context.destination);

        // technically we'll have more playing power than maxSounds would
        // suggest but will consider the voices and streams a union and never
        // exceed maxSounds things playing together
        this.voices = new GenerationalArena(maxSounds);
        this.streams = new GenerationalArena(maxStreams);
    }

    suspend() {
        if (this.context.state === "suspended") {
            return;
        }

        // todo: kill active sounds

        this.context.suspend();
    }

    resume() {
        if (this.context.state === "running") {
            return;
        }

        this.context.resume();
    }

    createMixer(name : string, parentTo? : Mixer) : Mixer | undefined {
        if (this.mixerMap[name]) {
            return undefined;
        }

        const parent = parentTo ?? this.masterMixer;
        const mixer = this.mixerMap[name] =  new Mixer(this.context, name, parent);
        return mixer;
    }

    addMixer(mixer : Mixer) : boolean {
        if (mixer.context !== this.context) {
            return false;
        } 

        if (this.mixerMap[mixer.name]) {
            return false;
        }

        if (!mixer.parent) {
            mixer.connect(this.masterMixer);
        }

        this.mixerMap[mixer.name] = mixer;
        return true;
    }

    getMixer(name : string) : Mixer | undefined {
        return this.mixerMap[name];
    }

    play(playable : Playable, optionalMixer? : string) : VoiceGenerationHandle | StreamGenerationHandle | undefined {
        switch (playable.kind) {
            case "sound":
                return this.playSound(playable, optionalMixer);
            case "music":
                return this.playMusic(playable, optionalMixer);
        }
    }

    playSound(sound : SoundDefinition, optionalMixer? : string) : VoiceGenerationHandle | undefined {
        const buffer = this.assetMap[sound.asset];
        
        if (!buffer) {
            return undefined;
        }

        // if there is no space we cannot play this sound
        // log a warning and continue
        const freeSlots = this.numFreeSlots();
        if (freeSlots <= 0) {
            console.warn("mixdown had no free slots to play sound.");
            return undefined;
        }

        const ctx = this.context;
        if (freeSlots <= this.slopSize) {
            this.evictVoice(sound.priority);
        }

        let source = ctx.createBufferSource();
        source.buffer = buffer;

        if (sound.loop) {
            source.loop = true;
            if (sound.clip) {
                source.loopStart = sound.clip.start;
                source.loopEnd = sound.clip.end;
            }
        }

        let balance = ctx.createStereoPanner();
        source.connect(balance);

        let gain = ctx.createGain();
        balance.connect(gain);

        gain.gain.setValueAtTime(sound.gain, ctx.currentTime);

        var mixerName = optionalMixer ?? sound.mixer;
        var mixer = mixerName ? this.getMixer(mixerName) : this.masterMixer;
        if (mixer) {
            gain.connect(mixer.gainNode);
        }
        
        let start = 0;
        let duration = buffer.duration;

        if (sound.clip && (!sound.loop || !sound.loop.playIn)) {
            duration = Math.max(0, sound.clip.end - sound.clip.start);
            start = sound.clip.start;
        }

        if (!sound.loop) {
            source.start(0, start, duration);
        } else {
            source.start(0, start);
        }
    
        let playOut = sound.loop ? sound.loop.playOut : false
        let handle = this.voices.add({gain : gain, balance : balance, source : source, priority : sound.priority, playOut: playOut});

        if (!handle) {
            return undefined;
        }

        let voiceHandle : VoiceGenerationHandle = { kind : "voice", index : handle.index, generation : handle.generation};
        source.onended = () => { this.voiceEnded(voiceHandle); }

        return voiceHandle;
    }

    playMusic(music : MusicDefinition, optionalMixer? : string) : StreamGenerationHandle | undefined {
        if (this.streams.numFreeSlots() === 0) {
            return undefined;
        }

        // if there is no space we cannot play this music
        // log a warning and continue
        const freeSlots = this.numFreeSlots();
        if (freeSlots <= 0) {
            console.warn("mixdown had no free slots to play music.");
            return undefined;
        }

        // we don't do eviction for music as the assumption is that we're changing tracks and music is highest priority
        // and long lasting so we can afford to take up some slop and let sounds adjust accordingly

        const audio = new Audio(music.source);
        audio.autoplay = true;
        audio.loop = true;

        const ctx = this.context;

        let source = ctx.createMediaElementSource(audio);

        let balance = ctx.createStereoPanner();
        source.connect(balance);

        let gain = ctx.createGain();
        balance.connect(gain);

        gain.gain.setValueAtTime(music.gain, ctx.currentTime);

        var mixerName = optionalMixer ?? music.mixer;
        var mixer = mixerName ? this.getMixer(mixerName) : this.masterMixer;
        if (mixer) {
            gain.connect(mixer.gainNode);
        }

        let handle = this.streams.add({gain : gain, balance : balance, source : source, audio: audio});

        if (!handle) {
            return undefined;
        }

        let streamHandle : StreamGenerationHandle = { kind : "stream", index : handle.index, generation : handle.generation};

        return streamHandle;
    }

    stop(index : VoiceGenerationHandle | StreamGenerationHandle) : OperationResult {
        if (index.kind === "voice") {
            return this.stopSound(index);
        } else {
            return this.stopMusic(index);
        }
    }

    stopSound(index : VoiceGenerationHandle) : OperationResult {
        const voice = this.voices.get(index);

        if (!voice) {
            return OperationResult.DOES_NOT_EXIST;
        }

        if (voice.source.loop && voice.playOut) {
            this.stopLoop(index);
        } else {
            voice.source.stop();
        }
        
        return OperationResult.SUCCESS;
    }

    stopMusic(index : StreamGenerationHandle) : OperationResult {
        const stream = this.streams.get(index);

        if (!stream) {
            return OperationResult.DOES_NOT_EXIST;
        }

        stream.source.disconnect();
        stream.gain.disconnect();
        stream.balance.disconnect();
        stream.audio.pause();
        
        this.streams.remove(index);

        return OperationResult.SUCCESS;
    }

    loop(index : VoiceGenerationHandle, start? : number, end? : number) : OperationResult {
        let element = this.voices.get(index);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        const source = element.source;
        source.loop = true;
        if (start) {
            source.loopStart = start;
        }

        if (end) {
            source.loopEnd = end;
        }
        return OperationResult.SUCCESS;
    }

    stopLoop(index : VoiceGenerationHandle) : OperationResult {
        let element = this.voices.get(index);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        const source = element.source;
        source.loop = false;
        source.loopStart = 0;
        source.loopEnd = 0;
        return OperationResult.SUCCESS;
    }

    fadeTo(index : VoiceGenerationHandle | StreamGenerationHandle, value : number, duration : number) : OperationResult {
        let element = this.getElement(index);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        // ramp dislikes stuff in the range of ±1.40130e-45, at least in chrome
        if (value < 1.40130e-45) {
            value = 0.001;
        }

        element.gain.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
        return OperationResult.SUCCESS;
    }

    fadeOut(index : VoiceGenerationHandle | StreamGenerationHandle, duration : number) : OperationResult {
        return this.fadeTo(index, 0.001, duration);
    }

    gain(index : VoiceGenerationHandle | StreamGenerationHandle, value : number) : OperationResult {
        let element = this.getElement(index);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.gain.gain.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }

    balance(index : VoiceGenerationHandle | StreamGenerationHandle, value : number) : OperationResult {
        let element = this.getElement(index);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.balance.pan.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }

    loadAsset(name : string, path : string) : Promise<boolean> {
        // todo: make sure we're loading something we support
        // todo: xmlhttprequest for backwards compat?

        return new Promise<boolean>((resolve, reject) => {
            fetch(path)
            .then(response => response.arrayBuffer())
            .then(data => this.context.decodeAudioData(data))
            .then(buffer => {
                this.assetMap[name] = buffer;
                resolve(true);
            })
            .catch(error => {
                console.log(error); 
                reject(false);
            });
        });
    }

    numFreeSlots() : number {
        return this.voices.numFreeSlots() - this.streams.numUsedSlots();
    }

    getBuffer(assetName : string) : AudioBuffer | undefined {
        return this.assetMap[assetName];
    }

    isPlaying(index : VoiceGenerationHandle | StreamGenerationHandle) : boolean {
        let element = this.getElement(index);
        return element !== undefined;
    }

    private getElement(index : VoiceGenerationHandle | StreamGenerationHandle) : Voice | Stream | undefined {
        let element : Voice | Stream | undefined = undefined;
        if (index.kind === "voice") {
            element = this.voices.get(index);
        } else {
            element = this.streams.get(index);
        }
        return element;
    }

    private voiceEnded(handle : VoiceGenerationHandle) {
        let voice = this.voices.get(handle);

        if (!voice) {
            return;
        }

        voice.source.disconnect();
        voice.source.buffer = null;
        voice.gain.disconnect();
        voice.balance.disconnect();
        
        this.voices.remove(handle);
    }

    private evictVoice(priority : number) : boolean {
        // we are going to nicely evict one of the currently playing sounds at
        // a lower priority, music is counted as never to be removed
        // right now we're just going to evict the first thing we come across
        // in the future we might want this to be more heuristic based 
        // (e.g. evict the quietest sound with the lowest priority)
        let voice = this.voices.findFirst((voice) => { return voice.priority < priority; });

        if (!voice) {
            return false;
        }

        const ctx = this.context;
        // fade out then remove sound pointed too by handle
        voice.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + this.removalFadeDuration);
        voice.source.stop(ctx.currentTime + this.removalFadeDuration); // this triggers removal through callback

        return true;
    }
}