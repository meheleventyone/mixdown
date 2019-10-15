// A Web Audio based mixer for games.

import {GenerationHandle, GenerationalArena} from "./GenerationalArena.js";

enum Priority {
    Low = 0,
    Medium,
    High
}

interface SoundLoop {
    start : number;
    end : number;
}

interface SoundClip {
    start : number;
    end : number;
}

interface Sound {
    kind : "sound";
    priority : Priority;
    asset : string;
    gain : number;
    loop? : SoundLoop;
    clip? : SoundClip;
}

interface Music {
    kind : "music";
    source : string;
    gain : number;
}

type Playable = Sound | Music;

enum OperationResult {
    SUCCESS = 0,
    DOES_NOT_EXIST,
}

interface Voice {
    gain : GainNode;
    balance : StereoPannerNode;
    source : AudioBufferSourceNode;
    priority : Priority;
}

interface Stream {
    gain: GainNode;
    balance: StereoPannerNode;
    source: MediaElementAudioSourceNode;
    audio: HTMLAudioElement;
}

type VoiceGenerationHandle = {kind : "voice"} & GenerationHandle;
type StreamGenerationHandle = {kind : "stream"} & GenerationHandle;

export class Mixdown {
    context : AudioContext = new AudioContext();
    assetMap : Record<string, AudioBuffer> = {};
    maxSounds : number;
    slopSize : number;
    masterGain : GainNode;
    voices : GenerationalArena<Voice>;
    streams : GenerationalArena<Stream>;
    removalFadeDuration : number = 0.2;

    constructor(maxSounds : number = 32, maxStreams = 2, slopSize : number = 4) {
        this.maxSounds = maxSounds;
        this.slopSize = slopSize;

        this.masterGain = this.context.createGain()
        this.masterGain.connect(this.context.destination);

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

    play(playable : Playable) : VoiceGenerationHandle | StreamGenerationHandle | undefined {
        switch (playable.kind) {
            case "sound":
                return this.playSound(playable);
            case "music":
                return this.playMusic(playable);
        }
        return undefined;
    }

    playSound(sound : Sound) : VoiceGenerationHandle | undefined {
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
            source.loopStart = sound.loop.start;
            source.loopEnd = sound.loop.end;
        }

        let balance = ctx.createStereoPanner();
        source.connect(balance);

        let gain = ctx.createGain();
        balance.connect(gain);

        gain.gain.setValueAtTime(sound.gain, ctx.currentTime);
        gain.connect(this.masterGain);

        let start = 0;
        let duration = buffer.duration;
        if (sound.clip) {
            duration = Math.max(0, sound.clip.end - sound.clip.start);
            start = sound.clip.start;
        }

        source.start(0, start, duration);

        let handle = this.voices.add({gain : gain, balance : balance, source : source, priority : sound.priority});

        if (!handle) {
            return undefined;
        }

        let voiceHandle : VoiceGenerationHandle = { kind : "voice", index : handle.index, generation : handle.generation};
        source.onended = () => { this.voiceEnded(voiceHandle); }

        return voiceHandle;
    }

    playMusic(music : Music) : StreamGenerationHandle | undefined {
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
        gain.connect(this.masterGain);

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

        if (!voice.source) {
            return OperationResult.DOES_NOT_EXIST;
        }

        voice.source.stop();
        return OperationResult.SUCCESS;
    }

    stopMusic(index : StreamGenerationHandle) : OperationResult {
        const stream = this.streams.get(index);

        if (!stream || !stream.source || !stream.gain || !stream.balance) {
            return OperationResult.DOES_NOT_EXIST;
        }

        stream.source.disconnect();
        stream.gain.disconnect();
        stream.balance.disconnect();
        stream.audio.pause();
        
        this.streams.remove(index);

        return OperationResult.SUCCESS;
    }

    loop(index : VoiceGenerationHandle, start : number = 0, end : number = 0) : OperationResult {
        let element = this.voices.get(index);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        const source = element.source;
        source.loop = true;
        source.loopStart = start;
        source.loopEnd = end;
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
        let element : Voice | Stream | undefined;
        if (index.kind === "voice") {
            element = this.voices.get(index);
        } else {
            element = this.streams.get(index);
        }

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.gain.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
        return OperationResult.SUCCESS;
    }

    fadeOut(index : VoiceGenerationHandle | StreamGenerationHandle, duration : number) : OperationResult {
        return this.fadeTo(index, 0.001, duration);
    }

    gain(index : VoiceGenerationHandle | StreamGenerationHandle, value : number) : OperationResult {
        let element : Voice | Stream | undefined;
        if (index.kind === "voice") {
            element = this.voices.get(index);
        } else {
            element = this.streams.get(index);
        }

        if (!element || !element.gain) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.gain.gain.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }

    balance(index : VoiceGenerationHandle | StreamGenerationHandle, value : number) : OperationResult {
        let element : Voice | Stream | undefined;
        if (index.kind === "voice") {
            element = this.voices.get(index);
        } else {
            element = this.streams.get(index);
        }

        if (!element || !element.balance) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.balance.pan.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }

    loadAsset(name : string, path : string) {
        // todo: make sure we're loading something we support
        // todo: return promise from this to cover user callbacks?
        // todo: xmlhttprequest for backwards compat?

        fetch(path)
        .then(response => response.arrayBuffer())
        .then(data => this.context.decodeAudioData(data))
        .then(buffer => this.assetMap[name] = buffer)
        .catch(error => console.error(error));
    }

    numFreeSlots() : number {
        return this.voices.numFreeSlots() - this.streams.numUsedSlots();
    }

    private voiceEnded(handle : VoiceGenerationHandle) {
        let voice = this.voices.get(handle);

        if (!voice || !voice.source || !voice.gain || !voice.balance) {
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

        if (voice === undefined || !voice.gain || !voice.source) {
            return false;
        }

        const ctx = this.context;
        // fade out then remove sound pointed too by handle
        voice.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + this.removalFadeDuration);
        voice.source.stop(ctx.currentTime + this.removalFadeDuration); // this triggers removal through callback

        return true;
    }
}