// A Web Audio based mixer for games.

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

    loadAsset(name : string, path : string) {
        // todo: make sure we're loading something we support
        // todo: return promise from this to cover user callbacks?

        fetch(path).then(response => response.arrayBuffer())
        .then(data => this.context.decodeAudioData(data))
        .then(buffer => this.assetMap[name] = buffer)
        .catch(error => console.error(error));
    }
}