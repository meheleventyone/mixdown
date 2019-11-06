// todo: maybe let this take a second type constrained to being something that matches
// GenerationHandle so users can define the return type if they don't want to wrap the 
// arena
class GenerationalArena {
    constructor(size) {
        this.generation = [];
        this.data = [];
        this.freeList = [];
        for (let i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = null;
            this.freeList.push(i);
        }
    }
    add(data) {
        if (this.freeList.length === 0) {
            return undefined;
        }
        let index = this.freeList.pop();
        this.data[index] = data;
        return { index: index, generation: this.generation[index] };
    }
    get(handle) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        let index = handle.index;
        if (this.data[index] === null) {
            return undefined;
        }
        return this.data[index];
    }
    findFirst(test) {
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
    remove(handle) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        let index = handle.index;
        this.generation[index] += 1;
        this.data[index] = null;
        this.freeList.push(index);
    }
    valid(handle) {
        return handle.generation === this.generation[handle.index];
    }
    numFreeSlots() {
        return this.freeList.length;
    }
    numUsedSlots() {
        return this.data.length - this.freeList.length;
    }
}

// A Web Audio based mixer for games.
var Priority;
(function (Priority) {
    Priority[Priority["Low"] = 0] = "Low";
    Priority[Priority["Medium"] = 1] = "Medium";
    Priority[Priority["High"] = 2] = "High";
})(Priority || (Priority = {}));
var OperationResult;
(function (OperationResult) {
    OperationResult[OperationResult["SUCCESS"] = 0] = "SUCCESS";
    OperationResult[OperationResult["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
})(OperationResult || (OperationResult = {}));
class Mixdown {
    constructor(maxSounds = 32, maxStreams = 2, slopSize = 4) {
        this.context = new AudioContext();
        this.assetMap = {};
        this.removalFadeDuration = 0.2;
        this.maxSounds = maxSounds;
        this.slopSize = slopSize;
        this.masterGain = this.context.createGain();
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
    play(playable) {
        switch (playable.kind) {
            case "sound":
                return this.playSound(playable);
            case "music":
                return this.playMusic(playable);
        }
        return undefined;
    }
    playSound(sound) {
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
        gain.connect(this.masterGain);
        let start = 0;
        let duration = buffer.duration;
        if (sound.clip && (!sound.loop || !sound.loop.playIn)) {
            duration = Math.max(0, sound.clip.end - sound.clip.start);
            start = sound.clip.start;
        }
        if (!sound.loop) {
            source.start(0, start, duration);
        }
        else {
            source.start(0, start);
        }
        let playOut = sound.loop ? sound.loop.playOut : false;
        let handle = this.voices.add({ gain: gain, balance: balance, source: source, priority: sound.priority, playOut: playOut });
        if (!handle) {
            return undefined;
        }
        let voiceHandle = { kind: "voice", index: handle.index, generation: handle.generation };
        source.onended = () => { this.voiceEnded(voiceHandle); };
        return voiceHandle;
    }
    playMusic(music) {
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
        let handle = this.streams.add({ gain: gain, balance: balance, source: source, audio: audio });
        if (!handle) {
            return undefined;
        }
        let streamHandle = { kind: "stream", index: handle.index, generation: handle.generation };
        return streamHandle;
    }
    stop(index) {
        if (index.kind === "voice") {
            return this.stopSound(index);
        }
        else {
            return this.stopMusic(index);
        }
    }
    stopSound(index) {
        const voice = this.voices.get(index);
        if (!voice) {
            return OperationResult.DOES_NOT_EXIST;
        }
        if (!voice.source) {
            return OperationResult.DOES_NOT_EXIST;
        }
        if (voice.source.loop && voice.playOut) {
            this.stopLoop(index);
        }
        else {
            voice.source.stop();
        }
        return OperationResult.SUCCESS;
    }
    stopMusic(index) {
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
    loop(index, start, end) {
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
    stopLoop(index) {
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
    fadeTo(index, value, duration) {
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
    fadeOut(index, duration) {
        return this.fadeTo(index, 0.001, duration);
    }
    gain(index, value) {
        let element = this.getElement(index);
        if (!element || !element.gain) {
            return OperationResult.DOES_NOT_EXIST;
        }
        element.gain.gain.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }
    balance(index, value) {
        let element = this.getElement(index);
        if (!element || !element.balance) {
            return OperationResult.DOES_NOT_EXIST;
        }
        element.balance.pan.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }
    loadAsset(name, path) {
        // todo: make sure we're loading something we support
        // todo: xmlhttprequest for backwards compat?
        return new Promise((resolve, reject) => {
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
    numFreeSlots() {
        return this.voices.numFreeSlots() - this.streams.numUsedSlots();
    }
    getBuffer(assetName) {
        return this.assetMap[assetName];
    }
    isPlaying(index) {
        let element = this.getElement(index);
        return element !== undefined;
    }
    getElement(index) {
        let element = undefined;
        if (index.kind === "voice") {
            element = this.voices.get(index);
        }
        else {
            element = this.streams.get(index);
        }
        return element;
    }
    voiceEnded(handle) {
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
    evictVoice(priority) {
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

export { Mixdown, OperationResult, Priority };
