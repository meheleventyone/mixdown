// A Web Audio based mixer for games.
enum Priority {
    Low = 0,
    Medium,
    High
}

interface Sample {
    kind : "sample";
    asset : string;
    gain : number;
    priority : Priority;
}

interface Sfx {
    kind : "sfx";
    samples : [Sample];
    priority : Priority; // sfx priority superceeds Sample priority
}

interface Music {
    kind : "music";
    asset : string;
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

    freeSlots() : number {
        return this.freeList.length;
    }
}

type Playable = Sample | Sfx | Music;

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

class Mixdown {
    context : AudioContext = new AudioContext();
    assetMap : Record<string, AudioBuffer> = {};
    maxVoices : number;
    slopSize : number;
    masterGain : GainNode;
    voices : GenerationalArena<Voice>;

    constructor(maxVoices : number = 32, slopSize : number = 4) {
        this.maxVoices = maxVoices;
        this.slopSize = 4;

        this.masterGain = this.context.createGain()
        this.masterGain.connect(this.context.destination);

        this.voices = new GenerationalArena(maxVoices);
    }

    suspend() {
        if (this.context.state === "suspended") {
            return;
        }

        // todo: remove all current nodes

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

    play(playable : Playable) : GenerationHandle | undefined {
        switch (playable.kind) {
            case "sample":
                return this.playSample(playable);
            case "sfx":
                return this.playSfx(playable);
            case "music":
                return this.playMusic(playable);
        }
        return undefined;
    }

    playSample(sample : Sample) : GenerationHandle | undefined {
        const buffer = this.assetMap[sample.asset];
        
        if (!buffer) {
            return undefined;
        }

        if (this.voices.freeSlots() === 0) {
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

        if (handle) {
            source.onended = () => { this.ended(handle as GenerationHandle); }
        }
        return handle;
    }

    private ended(handle : GenerationHandle) {
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

    playSfx(sfx : Sfx) : GenerationHandle | undefined {
        return undefined;
    }

    playMusic(music : Music) : GenerationHandle | undefined {
        return undefined;
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
}