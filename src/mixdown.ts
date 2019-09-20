// A Web Audio based mixer for games.

interface Sample {
    kind : "sample";
    asset : string;
    gain : number;
    startSample : number;
    endSample : number;
}

interface Sfx {
    kind : "sfx";
    samples : [Sample];
    priority : "high" | "medium" | "low";
}

interface Music {
    kind : "music";
    asset : string;
    gain : number;
}

interface Index {
    readonly index : number;
    readonly generation : number;
}

type Playable = Sample | Sfx | Music;

type IndexResult = "success" | "doesNotExist" | "oldGeneration";

class Mixdown {
    context : AudioContext = new AudioContext();
    assetMap : Record<string, AudioBuffer> = {};
    maxVoices : number;
    slopSize : number;
    masterGain : GainNode;

    constructor(maxVoices : number = 32, slopSize : number = 4) {
        this.maxVoices = maxVoices;
        this.slopSize = 4;

        this.masterGain = this.context.createGain()
        this.masterGain.connect(this.context.destination);
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

    play(playable : Playable) : Index | undefined {
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

    playSample(sample : Sample) : Index | undefined {
        const buffer = this.assetMap[sample.asset];
        
        if(!buffer) {
            return undefined;
        }

        // todo: find a free voice

        const ctx = this.context;

        let source = ctx.createBufferSource();
        source.buffer = buffer;

        let balance = ctx.createStereoPanner();
        source.connect(balance);

        let gain = ctx.createGain();
        balance.connect(gain);

        gain.gain.setValueAtTime(sample.gain, ctx.currentTime);

        // todo: we need to store the above in the voice and return a generational index to it

        return undefined;
    }

    playSfx(sfx : Sfx) : Index | undefined {
        return undefined;
    }

    playMusic(music : Music) : Index | undefined {
        return undefined;
    }

    stop(index : Index) : IndexResult {
        return "doesNotExist";
    }

    fadeIn(index : Index, value : number, duration : number) : IndexResult {
        return "doesNotExist";
    }

    fadeOut(index : Index, value : number, duration : number) : IndexResult {
        return "doesNotExist";
    }

    gain(index : Index, value : number) : IndexResult {
        return "doesNotExist";
    }

    balance(index : Index, value : number) : IndexResult {
        return "doesNotExist";
    }

    loadAsset(name : string, path : string) {
        // todo: make sure we're loading something we support
        // todo: return promise from this to cover user callbacks?
        // todo: xmlhttprequest for backwards compat?

        fetch(path).then(response => response.arrayBuffer())
        .then(data => this.context.decodeAudioData(data))
        .then(buffer => this.assetMap[name] = buffer)
        .catch(error => console.error(error));
    }
}