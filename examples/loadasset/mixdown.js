"use strict";
// A Web Audio based mixer for games.
var Priority;
(function (Priority) {
    Priority[Priority["Low"] = 0] = "Low";
    Priority[Priority["Medium"] = 1] = "Medium";
    Priority[Priority["High"] = 2] = "High";
})(Priority || (Priority = {}));
var GenerationalArray = /** @class */ (function () {
    function GenerationalArray(initialSize, noResize) {
        if (noResize === void 0) { noResize = true; }
        this.generation = [];
        this.data = [];
        this.freeList = [];
        this.noResize = noResize;
        for (var i = 0; i < initialSize; ++i) {
            this.generation[i] = 0;
            this.data[i] = null;
            this.freeList.push(i);
        }
    }
    GenerationalArray.prototype.add = function (data) {
        var index = -1;
        if (this.freeList.length == 0) {
            if (this.noResize) {
                return undefined;
            }
            index = this.data.length;
        }
        else {
            index = this.freeList.pop();
        }
        index = index;
        this.data[index] = data;
        return { index: index, generation: this.generation[index] };
    };
    GenerationalArray.prototype.get = function (handle) {
        if (handle.generation != this.generation[handle.index]) {
            return undefined;
        }
        var index = handle.index;
        if (this.data[index] == null) {
            return undefined;
        }
        return this.data[index];
    };
    GenerationalArray.prototype.remove = function (handle) {
        if (handle.generation != this.generation[handle.index]) {
            return undefined;
        }
        var index = handle.index;
        this.generation[index] += 1;
        this.data[index] = null;
        this.freeList.push(index);
    };
    GenerationalArray.prototype.valid = function (handle) {
        return handle.generation == this.generation[handle.index];
    };
    GenerationalArray.prototype.freeSlots = function () {
        return this.freeList.length;
    };
    return GenerationalArray;
}());
var Mixdown = /** @class */ (function () {
    function Mixdown(maxVoices, slopSize) {
        if (maxVoices === void 0) { maxVoices = 32; }
        if (slopSize === void 0) { slopSize = 4; }
        this.context = new AudioContext();
        this.assetMap = {};
        this.maxVoices = maxVoices;
        this.slopSize = 4;
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        this.voices = new GenerationalArray(maxVoices);
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
            case "sfx":
                return this.playSfx(playable);
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
        if (this.voices.freeSlots() == 0) {
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
        if (handle) {
            source.onended = function () { _this.ended(handle); };
        }
        return handle;
    };
    Mixdown.prototype.ended = function (handle) {
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
    Mixdown.prototype.playSfx = function (sfx) {
        return undefined;
    };
    Mixdown.prototype.playMusic = function (music) {
        return undefined;
    };
    Mixdown.prototype.stop = function (index) {
        return "doesNotExist";
    };
    Mixdown.prototype.fadeIn = function (index, value, duration) {
        return "doesNotExist";
    };
    Mixdown.prototype.fadeOut = function (index, value, duration) {
        return "doesNotExist";
    };
    Mixdown.prototype.gain = function (index, value) {
        return "doesNotExist";
    };
    Mixdown.prototype.balance = function (index, value) {
        return "doesNotExist";
    };
    Mixdown.prototype.loadAsset = function (name, path) {
        // todo: make sure we're loading something we support
        // todo: return promise from this to cover user callbacks?
        // todo: xmlhttprequest for backwards compat?
        var _this = this;
        fetch(path).then(function (response) { return response.arrayBuffer(); })
            .then(function (data) { return _this.context.decodeAudioData(data); })
            .then(function (buffer) { return _this.assetMap[name] = buffer; })
            .catch(function (error) { return console.error(error); });
    };
    return Mixdown;
}());
