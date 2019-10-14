// A Web Audio based mixer for games.
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

interface GenerationHandle {
    readonly index : number;
    readonly generation : number;
}

// todo: maybe let this take a second type constrained to being something that matches
// GenerationHandle so users can define the return type if they don't want to wrap the 
// arena
class GenerationalArena<T> {
    generation : number[] = [];
    data : (T | null)[] = [];
    freeList : number[] = [];

    constructor(size : number) {
        for (let i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = null;
            this.freeList.push(i);
        }
    }

    add(data : T) : GenerationHandle | undefined {
        if (this.freeList.length === 0) {
            return undefined;
        }

        let index = this.freeList.pop() as number;
        this.data[index] = data;
        return { index : index, generation : this.generation[index] };
    }

    get(handle : GenerationHandle) : T | undefined {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }

        let index = handle.index;
        if (this.data[index] === null) {
            return undefined;
        }

        return this.data[index] as T;
    }

    findFirst(test : (data : T) => boolean) : T | undefined {
        for (let i = 0; i < this.data.length; ++i) {
            let data = this.data[i];
            if (data === null) {
                continue;
            }
            
            if (!test(data)) {
                continue;
            }

            return data;
        }
    }

    remove(handle : GenerationHandle) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        let index = handle.index;
        this.generation[index] += 1;
        this.data[index] = null;
        this.freeList.push(index);
    }

    valid(handle : GenerationHandle) : boolean {
        return handle.generation === this.generation[handle.index];
    }

    numFreeSlots() : number {
        return this.freeList.length;
    }

    numUsedSlots() : number {
        return this.data.length - this.freeList.length;
    }
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

class Mixdown {
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
            // we are going to nicely evict one of the currently playing sounds at
            // a lower priority, music is counted as never to be removed
            // right now we're just going to evict the first thing we come across
            // in the future we might want this to be more heuristic based 
            // (e.g. evict the quietest sound with the lowest priority)
            let voice = this.voices.findFirst((voice) => { return voice.priority < sound.priority; });

            if (voice === undefined || !voice.gain || !voice.source) {
                console.warn("mixdown used an element of slop without being able to evict");
            } else {
                // fade out then remove sound pointed too by handle
                voice.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + this.removalFadeDuration);
                voice.source.stop(ctx.currentTime + this.removalFadeDuration); // this triggers removal through callback
            }
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

        // todo evict an sfx is bank is fulls

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
}