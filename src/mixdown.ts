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