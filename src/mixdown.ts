// A Web Audio based mixer for games.
enum Priority {
    Low = 0,
    Medium,
    High
}

interface Sound {
    kind : "sound";
    asset : string;
    gain : number;
    priority : Priority;
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
    BAD_GENERATION,
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

    constructor(maxSounds : number = 32, maxStreams = 2, slopSize : number = 4) {
        this.maxSounds = maxSounds;
        this.slopSize = 4;

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

        this.context.suspend().then(this.rebuild);
    }

    resume() {
        if (this.context.state === "running") {
            return;
        }

        this.context.resume();
    }

    rebuild() {
        
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

    playSound(sample : Sound) : VoiceGenerationHandle | undefined {
        const buffer = this.assetMap[sample.asset];
        
        if (!buffer) {
            return undefined;
        }

        if (this.numFreeSlots() <= 0) {
            // todo priority search
            return undefined;
        }

        const ctx = this.context;

        let source = ctx.createBufferSource();
        source.buffer = buffer;

        let balance = ctx.createStereoPanner();
        source.connect(balance);

        let gain = ctx.createGain();
        balance.connect(gain);

        gain.gain.setValueAtTime(sample.gain, ctx.currentTime);
        gain.connect(this.masterGain);

        source.start();

        let handle = this.voices.add({gain : gain, balance : balance, source : source, priority : sample.priority});

        if (!handle) {
            return undefined;
        }

        let voiceHandle : VoiceGenerationHandle = { kind : "voice", index : handle.index, generation : handle.generation};
        source.onended = () => { this.voiceEnded(voiceHandle); }

        return voiceHandle;
    }

    playMusic(music : Music) : StreamGenerationHandle | undefined {
        if (this.numFreeSlots() <= 0 || this.streams.numFreeSlots() === 0) {
            // todo priority search
            return undefined;
        }
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

        let handle = this.streams.add({gain : gain, balance : balance, source : source});

        if (!handle) {
            return undefined;
        }

        let streamHandle : StreamGenerationHandle = { kind : "stream", index : handle.index, generation : handle.generation};

        return streamHandle;
    }

    stop(index : GenerationHandle) : OperationResult {
        return OperationResult.DOES_NOT_EXIST;
    }

    fadeIn(index : GenerationHandle, value : number, duration : number) : OperationResult {
        return OperationResult.DOES_NOT_EXIST;
    }

    fadeOut(index : GenerationHandle, value : number, duration : number) : OperationResult {
        return OperationResult.DOES_NOT_EXIST;
    }

    gain(index : GenerationHandle, value : number) : OperationResult {
        return OperationResult.DOES_NOT_EXIST;
    }

    balance(index : GenerationHandle, value : number) : OperationResult {
        return OperationResult.DOES_NOT_EXIST;
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

        if (!voice) {
            return;
        }

        voice.source.disconnect();
        voice.source.buffer = null;
        voice.gain.disconnect();
        voice.balance.disconnect();
        this.voices.remove(handle);
    }
}