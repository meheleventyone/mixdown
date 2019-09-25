"use strict";
// A Web Audio based mixer for games.
var Priority;
(function (Priority) {
    Priority[Priority["Low"] = 0] = "Low";
    Priority[Priority["Medium"] = 1] = "Medium";
    Priority[Priority["High"] = 2] = "High";
})(Priority || (Priority = {}));
var GenerationalArena = /** @class */ (function () {
    function GenerationalArena(size) {
        this.generation = [];
        this.data = [];
        this.freeList = [];
        for (var i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = null;
            this.freeList.push(i);
        }
    }
    GenerationalArena.prototype.add = function (data) {
        if (this.freeList.length === 0) {
            return undefined;
        }
        var index = this.freeList.pop();
        this.data[index] = data;
        return { index: index, generation: this.generation[index] };
    };
    GenerationalArena.prototype.get = function (handle) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        var index = handle.index;
        if (this.data[index] === null) {
            return undefined;
        }
        return this.data[index];
    };
    GenerationalArena.prototype.remove = function (handle) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        var index = handle.index;
        this.generation[index] += 1;
        this.data[index] = null;
        this.freeList.push(index);
    };
    GenerationalArena.prototype.valid = function (handle) {
        return handle.generation === this.generation[handle.index];
    };
    GenerationalArena.prototype.numFreeSlots = function () {
        return this.freeList.length;
    };
    GenerationalArena.prototype.numUsedSlots = function () {
        return this.data.length - this.freeList.length;
    };
    return GenerationalArena;
}());
var OperationResult;
(function (OperationResult) {
    OperationResult[OperationResult["SUCCESS"] = 0] = "SUCCESS";
    OperationResult[OperationResult["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
    OperationResult[OperationResult["BAD_GENERATION"] = 2] = "BAD_GENERATION";
})(OperationResult || (OperationResult = {}));
var Mixdown = /** @class */ (function () {
    function Mixdown(maxSounds, maxStreams, slopSize) {
        if (maxSounds === void 0) { maxSounds = 32; }
        if (maxStreams === void 0) { maxStreams = 2; }
        if (slopSize === void 0) { slopSize = 4; }
        this.context = new AudioContext();
        this.assetMap = {};
        this.maxSounds = maxSounds;
        this.slopSize = 4;
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        // technically we'll have more playing power than maxSounds would
        // suggest but will consider the voices and streams a union and never
        // exceed maxSounds things playing together
        this.voices = new GenerationalArena(maxSounds);
        this.streams = new GenerationalArena(maxStreams);
    }
    Mixdown.prototype.suspend = function () {
        if (this.context.state === "suspended") {
            return;
        }
        // todo: remove all current nodes
        this.context.suspend().then(this.rebuild);
    };
    Mixdown.prototype.resume = function () {
        if (this.context.state === "running") {
            return;
        }
        this.context.resume();
    };
    Mixdown.prototype.rebuild = function () {
    };
    Mixdown.prototype.play = function (playable) {
        switch (playable.kind) {
            case "sample":
                return this.playSample(playable);
            case "compound":
                return this.playCompoundSound(playable);
            case "music":
                return this.playMusic(playable);
        }
        return undefined;
    };
    Mixdown.prototype.playSample = function (sample) {
        var _this = this;
        var buffer = this.assetMap[sample.asset];
        if (!buffer) {
            return undefined;
        }
        if (this.numFreeSlots() <= 0) {
            // todo priority search
            return undefined;
        }
        var ctx = this.context;
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        var balance = ctx.createStereoPanner();
        source.connect(balance);
        var gain = ctx.createGain();
        balance.connect(gain);
        gain.gain.setValueAtTime(sample.gain, ctx.currentTime);
        gain.connect(this.masterGain);
        source.start();
        var handle = this.voices.add({ gain: gain, balance: balance, source: source, priority: sample.priority });
        if (!handle) {
            return undefined;
        }
        var voiceHandle = { kind: "voice", index: handle.index, generation: handle.generation };
        source.onended = function () { _this.voiceEnded(voiceHandle); };
        return voiceHandle;
    };
    Mixdown.prototype.playCompoundSound = function (sound) {
        return undefined;
    };
    Mixdown.prototype.playMusic = function (music) {
        if (this.numFreeSlots() <= 0 || this.streams.numFreeSlots() === 0) {
            // todo priority search
            return undefined;
        }
        var audio = new Audio(music.source);
        audio.autoplay = true;
        audio.loop = true;
        var ctx = this.context;
        var source = ctx.createMediaElementSource(audio);
        var balance = ctx.createStereoPanner();
        source.connect(balance);
        var gain = ctx.createGain();
        balance.connect(gain);
        gain.gain.setValueAtTime(music.gain, ctx.currentTime);
        gain.connect(this.masterGain);
        var handle = this.streams.add({ gain: gain, balance: balance, source: source });
        if (!handle) {
            return undefined;
        }
        var streamHandle = { kind: "stream", index: handle.index, generation: handle.generation };
        return streamHandle;
    };
    Mixdown.prototype.stop = function (index) {
        return OperationResult.DOES_NOT_EXIST;
    };
    Mixdown.prototype.fadeIn = function (index, value, duration) {
        return OperationResult.DOES_NOT_EXIST;
    };
    Mixdown.prototype.fadeOut = function (index, value, duration) {
        return OperationResult.DOES_NOT_EXIST;
    };
    Mixdown.prototype.gain = function (index, value) {
        return OperationResult.DOES_NOT_EXIST;
    };
    Mixdown.prototype.balance = function (index, value) {
        return OperationResult.DOES_NOT_EXIST;
    };
    Mixdown.prototype.loadAsset = function (name, path) {
        // todo: make sure we're loading something we support
        // todo: return promise from this to cover user callbacks?
        // todo: xmlhttprequest for backwards compat?
        var _this = this;
        fetch(path)
            .then(function (response) { return response.arrayBuffer(); })
            .then(function (data) { return _this.context.decodeAudioData(data); })
            .then(function (buffer) { return _this.assetMap[name] = buffer; })
            .catch(function (error) { return console.error(error); });
    };
    Mixdown.prototype.numFreeSlots = function () {
        return this.voices.numFreeSlots() - this.streams.numUsedSlots();
    };
    Mixdown.prototype.voiceEnded = function (handle) {
        var voice = this.voices.get(handle);
        if (!voice) {
            return;
        }
        voice.source.disconnect();
        voice.source.buffer = null;
        voice.gain.disconnect();
        voice.balance.disconnect();
        this.voices.remove(handle);
    };
    return Mixdown;
}());
