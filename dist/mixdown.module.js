class GenerationalArena {
    constructor(size) {
        this.generation = [];
        this.data = [];
        this.freeList = [];
        for (let i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = undefined;
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
        return this.data[index];
    }
    findFirst(test) {
        for (let i = 0; i < this.data.length; ++i) {
            let data = this.data[i];
            if (data === undefined) {
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
        this.data[index] = undefined;
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
// definitions
var Priority;
(function (Priority) {
    Priority[Priority["Low"] = 0] = "Low";
    Priority[Priority["Medium"] = 1] = "Medium";
    Priority[Priority["High"] = 2] = "High";
})(Priority || (Priority = {}));
// todo: can this be purely internal, I think so but lets see
class Bank {
    constructor() {
        this.assets = [];
        this.sounds = [];
        this.streams = [];
        this.mixers = [];
    }
    get(name) {
        var _a, _b, _c, _d;
        return _d = (_c = (_b = (_a = this.getAssetDefinition(name), (_a !== null && _a !== void 0 ? _a : this.getSoundDefinition(name))), (_b !== null && _b !== void 0 ? _b : this.getStreamDefinition(name))), (_c !== null && _c !== void 0 ? _c : this.getMixerDefinition(name))), (_d !== null && _d !== void 0 ? _d : undefined);
    }
    getAssetDefinition(name) {
        return this.assets.find((item) => item.name === name);
    }
    getSoundDefinition(name) {
        return this.sounds.find((item) => item.name === name);
    }
    getStreamDefinition(name) {
        return this.streams.find((item) => item.name === name);
    }
    getMixerDefinition(name) {
        return this.mixers.find((item) => item.name === name);
    }
}
class BankBuilder {
    constructor() {
        this.bank = new Bank();
    }
    getBank(definition) {
        switch (definition.kind) {
            case "asset":
                return this.bank.assets;
            case "mixer":
                return this.bank.mixers;
            case "stream":
                return this.bank.streams;
            case "sound":
                return this.bank.sounds;
        }
    }
    add(definition) {
        var _a, _b;
        const definitionStore = this.getBank(definition);
        const index = (_a = definitionStore) === null || _a === void 0 ? void 0 : _a.findIndex((item) => item.name === definition.name);
        if (index !== -1) {
            console.warn("Attempting to add existing name %s as a %s", definition.name, definition.kind);
            return;
        }
        (_b = definitionStore) === null || _b === void 0 ? void 0 : _b.push(definition);
    }
    createAssetDefinition(name, source) {
        const asset = { kind: "asset", name: name, source: source };
        this.add(asset);
    }
    createSoundDefinition(name, priority, asset, gain, loop, clip, mixer) {
        const sound = {
            kind: "sound",
            name: name,
            priority: priority,
            asset: asset,
            gain: gain,
            loop: loop,
            clip: clip,
            mixer: mixer
        };
        this.add(sound);
    }
    createStreamDefinition(name, source, gain, mixer) {
        const stream = {
            kind: "stream",
            name: name,
            source: source,
            gain: gain,
            mixer: mixer
        };
        this.add(stream);
    }
    createMixerDefinition(name, gain, parent) {
        const mixer = {
            kind: "mixer",
            name: name,
            parent: parent,
            gain: gain
        };
        this.add(mixer);
    }
    validate() {
        let valid = true;
        // check all sounds reference valid asset names
        // and valid mixers
        for (let i = 0; i < this.bank.sounds.length; ++i) {
            const soundDef = this.bank.sounds[i];
            const assetDef = this.bank.getAssetDefinition(soundDef.asset);
            if (!assetDef) {
                console.warn("Bank Validation Issue: Sound %s references missing Asset %s", soundDef.name, soundDef.asset);
                valid = false;
            }
            if (!soundDef.mixer) {
                break;
            }
            const mixerDef = this.bank.getMixerDefinition(soundDef.mixer);
            if (!mixerDef) {
                console.warn("Bank Validation Issue: Sound %s references missing Mixer %s", soundDef.name, soundDef.mixer);
                valid = false;
            }
        }
        // check mixers are valid
        for (let i = 0; i < this.bank.streams.length; ++i) {
            const streamDef = this.bank.streams[i];
            if (!streamDef.mixer) {
                break;
            }
            const mixerDef = this.bank.getMixerDefinition(streamDef.mixer);
            if (!mixerDef) {
                console.warn("Bank Validation Issue: Stream %s references missing Mixer %s", streamDef.name, streamDef.mixer);
                valid = false;
            }
        }
        // check parents are valid
        for (let i = 0; i < this.bank.mixers.length; ++i) {
            const mixerDef = this.bank.mixers[i];
            if (!mixerDef.parent) {
                continue;
            }
            const parentDef = this.bank.getMixerDefinition(mixerDef.parent);
            if (!parentDef) {
                console.warn("Bank Validation Issue: Mixer %s references missing parent Mixer %s", mixerDef.name, mixerDef.parent);
                valid = false;
            }
        }
        return valid;
    }
}
var LoadBankError;
(function (LoadBankError) {
    LoadBankError[LoadBankError["BANK_VALIDATION_FAIL"] = 0] = "BANK_VALIDATION_FAIL";
})(LoadBankError || (LoadBankError = {}));
var OperationResult;
(function (OperationResult) {
    OperationResult[OperationResult["SUCCESS"] = 0] = "SUCCESS";
    OperationResult[OperationResult["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
})(OperationResult || (OperationResult = {}));
class Mixer {
    constructor(context, name, parent) {
        this.context = context;
        this.gainNode = context.createGain();
        this.name = name;
        if (parent) {
            this.connect(parent);
        }
    }
    connect(to) {
        if (to instanceof Mixdown) {
            to.masterMixer.connect(this);
            return;
        }
        this.gainNode.connect(to.gainNode);
    }
    disconnect() {
        this.gainNode.disconnect();
    }
    gain(value) {
        this.gainNode.gain.setValueAtTime(value, this.context.currentTime);
    }
    fadeTo(value, duration) {
        // ramp dislikes stuff in the range of ±1.40130e-45, at least in chrome
        if (value < 1.40130e-45) {
            value = 0.001;
        }
        this.gainNode.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
    }
    fadeOut(duration) {
        this.fadeTo(0, duration);
    }
}
class Mixdown {
    constructor(maxSounds = 32, maxStreams = 2, slopSize = 4) {
        this.context = new AudioContext();
        this.assetMap = {};
        this.mixerMap = {};
        this.removalFadeDuration = 0.2;
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
    unloadBank() {
        var _a;
        if (!this.bank) {
            return;
        }
        this.stopAll();
        this.assetMap = {};
        var mixerNames = Object.keys(this.mixerMap);
        for (let i = 0; i < mixerNames.length; ++i) {
            (_a = this.mixerMap[mixerNames[i]]) === null || _a === void 0 ? void 0 : _a.disconnect();
        }
        this.mixerMap = {};
        this.bank = undefined;
    }
    loadBank(builder) {
        this.unloadBank();
        if (!builder.validate()) {
            return { kind: "error", error: LoadBankError.BANK_VALIDATION_FAIL };
        }
        this.bank = builder.bank;
        // first pass instantiate all the mixers
        for (let i = 0; i < this.bank.mixers.length; ++i) {
            const mixerDef = this.bank.mixers[i];
            const mixer = new Mixer(this.context, mixerDef.name);
            mixer.gain(mixerDef.gain);
            this.mixerMap[mixerDef.name] = mixer;
        }
        // second pass hook up the parenting graph
        for (let i = 0; i < this.bank.mixers.length; ++i) {
            const mixerDef = this.bank.mixers[i];
            const mixer = this.getMixer(mixerDef.name);
            const parent = mixerDef.parent ? this.getMixer(mixerDef.parent) : this.masterMixer;
            if (!mixer || !parent) {
                continue;
            }
            mixer.connect(parent);
        }
        var assetPromises = [];
        for (let i = 0; i < this.bank.assets.length; ++i) {
            var assetDef = this.bank.assets[i];
            var promise = this.loadAsset(assetDef.name, assetDef.source);
            assetPromises.push(promise);
        }
        return { kind: "value", value: Promise.all(assetPromises) };
    }
    suspend() {
        if (this.context.state === "suspended") {
            return;
        }
        this.stopAll();
        this.context.suspend();
    }
    resume() {
        if (this.context.state === "running") {
            return;
        }
        this.context.resume();
    }
    addMixer(mixer) {
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
    getMixer(name) {
        return this.mixerMap[name];
    }
    getSoundDef(name) {
        var _a;
        return (_a = this.bank) === null || _a === void 0 ? void 0 : _a.getSoundDefinition(name);
    }
    getStreamDef(name) {
        var _a;
        return (_a = this.bank) === null || _a === void 0 ? void 0 : _a.getStreamDefinition(name);
    }
    play(name, optionalMixer) {
        let playable = this.getSoundDef(name);
        if (playable) {
            return this.playSoundDef(playable, optionalMixer);
        }
        playable = this.getStreamDef(name);
        if (!playable) {
            return undefined;
        }
        return this.playStreamDef(playable, optionalMixer);
    }
    playSound(name, optionalMixer) {
        const soundDef = this.getSoundDef(name);
        if (!soundDef) {
            return undefined;
        }
        return this.playSoundDef(soundDef, optionalMixer);
    }
    playStream(name, optionalMixer) {
        const streamDef = this.getStreamDef(name);
        if (!streamDef) {
            return undefined;
        }
        return this.playStreamDef(streamDef, optionalMixer);
    }
    playPlayable(playable, optionalMixer) {
        switch (playable.kind) {
            case "sound":
                return this.playSoundDef(playable, optionalMixer);
            case "stream":
                return this.playStreamDef(playable, optionalMixer);
        }
    }
    playSoundDef(sound, optionalMixer) {
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
        var mixerName = (optionalMixer !== null && optionalMixer !== void 0 ? optionalMixer : sound.mixer);
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
    playStreamDef(stream, optionalMixer) {
        if (this.streams.numFreeSlots() === 0) {
            console.warn("mixdown had no free stream slots to play a stream " + stream.name);
            return undefined;
        }
        // if there is no space we cannot play this stream
        // log a warning and continue
        const freeSlots = this.numFreeSlots();
        if (freeSlots <= 0) {
            console.warn("mixdown had no free slots to play a stream " + stream.name);
            return undefined;
        }
        // we don't do eviction for streams as the assumption is that we're changing tracks and streams are highest priority
        // and long lasting so we can afford to take up some slop and let sounds adjust accordingly
        const audio = new Audio(stream.source);
        audio.autoplay = true;
        audio.loop = true;
        const ctx = this.context;
        let source = ctx.createMediaElementSource(audio);
        let balance = ctx.createStereoPanner();
        source.connect(balance);
        let gain = ctx.createGain();
        balance.connect(gain);
        gain.gain.setValueAtTime(stream.gain, ctx.currentTime);
        var mixerName = (optionalMixer !== null && optionalMixer !== void 0 ? optionalMixer : stream.mixer);
        var mixer = mixerName ? this.getMixer(mixerName) : this.masterMixer;
        if (mixer) {
            gain.connect(mixer.gainNode);
        }
        let handle = this.streams.add({ gain: gain, balance: balance, source: source, audio: audio });
        if (!handle) {
            return undefined;
        }
        let streamHandle = { kind: "stream", index: handle.index, generation: handle.generation };
        return streamHandle;
    }
    stopAll() {
        const numVoices = this.voices.data.length;
        for (let i = 0; i < numVoices; ++i) {
            let voice = this.voices.data[i];
            if (!voice) {
                continue;
            }
            voice.source.stop();
        }
        const numStreams = this.streams.data.length;
        for (let i = 0; i < numStreams; ++i) {
            var handle = { index: i, generation: this.streams.generation[i] };
            let stream = this.streams.get(handle);
            if (!stream) {
                continue;
            }
            stream.source.disconnect();
            stream.gain.disconnect();
            stream.balance.disconnect();
            stream.audio.pause();
            this.streams.remove(handle);
        }
    }
    stop(index) {
        if (index.kind === "voice") {
            return this.stopSound(index);
        }
        else {
            return this.stopStream(index);
        }
    }
    stopSound(index) {
        const voice = this.voices.get(index);
        if (!voice) {
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
    stopStream(index) {
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
        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }
        element.gain.gain.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }
    balance(index, value) {
        let element = this.getElement(index);
        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }
        element.balance.pan.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
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
        if (!voice) {
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
        // a lower priority, a stream is counted as never to be removed
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

export { Bank, BankBuilder, LoadBankError, Mixdown, Mixer, OperationResult, Priority };
