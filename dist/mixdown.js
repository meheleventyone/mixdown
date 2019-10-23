(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.mixdown = {}));
}(this, function (exports) { 'use strict';

    // todo: maybe let this take a second type constrained to being something that matches
    // GenerationHandle so users can define the return type if they don't want to wrap the 
    // arena
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
        GenerationalArena.prototype.findFirst = function (test) {
            for (var i = 0; i < this.data.length; ++i) {
                var data = this.data[i];
                if (data === null) {
                    continue;
                }
                if (!test(data)) {
                    continue;
                }
                return data;
            }
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

    // A Web Audio based mixer for games.
    (function (Priority) {
        Priority[Priority["Low"] = 0] = "Low";
        Priority[Priority["Medium"] = 1] = "Medium";
        Priority[Priority["High"] = 2] = "High";
    })(exports.Priority || (exports.Priority = {}));
    (function (OperationResult) {
        OperationResult[OperationResult["SUCCESS"] = 0] = "SUCCESS";
        OperationResult[OperationResult["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
    })(exports.OperationResult || (exports.OperationResult = {}));
    var Mixdown = /** @class */ (function () {
        function Mixdown(maxSounds, maxStreams, slopSize) {
            if (maxSounds === void 0) { maxSounds = 32; }
            if (maxStreams === void 0) { maxStreams = 2; }
            if (slopSize === void 0) { slopSize = 4; }
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
        Mixdown.prototype.suspend = function () {
            if (this.context.state === "suspended") {
                return;
            }
            // todo: kill active sounds
            this.context.suspend();
        };
        Mixdown.prototype.resume = function () {
            if (this.context.state === "running") {
                return;
            }
            this.context.resume();
        };
        Mixdown.prototype.play = function (playable) {
            switch (playable.kind) {
                case "sound":
                    return this.playSound(playable);
                case "music":
                    return this.playMusic(playable);
            }
            return undefined;
        };
        Mixdown.prototype.playSound = function (sound) {
            var _this = this;
            var buffer = this.assetMap[sound.asset];
            if (!buffer) {
                return undefined;
            }
            // if there is no space we cannot play this sound
            // log a warning and continue
            var freeSlots = this.numFreeSlots();
            if (freeSlots <= 0) {
                console.warn("mixdown had no free slots to play sound.");
                return undefined;
            }
            var ctx = this.context;
            if (freeSlots <= this.slopSize) {
                this.evictVoice(sound.priority);
            }
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            if (sound.loop) {
                source.loop = true;
                source.loopStart = sound.loop.start;
                source.loopEnd = sound.loop.end;
                if (sound.clip) {
                    source.loopStart = sound.clip.start;
                    source.loopEnd = sound.clip.end;
                }
            }
            var balance = ctx.createStereoPanner();
            source.connect(balance);
            var gain = ctx.createGain();
            balance.connect(gain);
            gain.gain.setValueAtTime(sound.gain, ctx.currentTime);
            gain.connect(this.masterGain);
            var start = 0;
            var duration = buffer.duration;
            if (sound.clip) {
                duration = Math.max(0, sound.clip.end - sound.clip.start);
                start = sound.clip.start;
            }
            if (!sound.loop) {
                source.start(0, start, duration);
            }
            else {
                source.start();
            }
            var handle = this.voices.add({ gain: gain, balance: balance, source: source, priority: sound.priority });
            if (!handle) {
                return undefined;
            }
            var voiceHandle = { kind: "voice", index: handle.index, generation: handle.generation };
            source.onended = function () { _this.voiceEnded(voiceHandle); };
            return voiceHandle;
        };
        Mixdown.prototype.playMusic = function (music) {
            if (this.streams.numFreeSlots() === 0) {
                return undefined;
            }
            // if there is no space we cannot play this music
            // log a warning and continue
            var freeSlots = this.numFreeSlots();
            if (freeSlots <= 0) {
                console.warn("mixdown had no free slots to play music.");
                return undefined;
            }
            // we don't do eviction for music as the assumption is that we're changing tracks and music is highest priority
            // and long lasting so we can afford to take up some slop and let sounds adjust accordingly
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
            var handle = this.streams.add({ gain: gain, balance: balance, source: source, audio: audio });
            if (!handle) {
                return undefined;
            }
            var streamHandle = { kind: "stream", index: handle.index, generation: handle.generation };
            return streamHandle;
        };
        Mixdown.prototype.stop = function (index) {
            if (index.kind === "voice") {
                return this.stopSound(index);
            }
            else {
                return this.stopMusic(index);
            }
        };
        Mixdown.prototype.stopSound = function (index) {
            var voice = this.voices.get(index);
            if (!voice) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            if (!voice.source) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            voice.source.stop();
            return exports.OperationResult.SUCCESS;
        };
        Mixdown.prototype.stopMusic = function (index) {
            var stream = this.streams.get(index);
            if (!stream || !stream.source || !stream.gain || !stream.balance) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            stream.source.disconnect();
            stream.gain.disconnect();
            stream.balance.disconnect();
            stream.audio.pause();
            this.streams.remove(index);
            return exports.OperationResult.SUCCESS;
        };
        Mixdown.prototype.loop = function (index, start, end) {
            if (start === void 0) { start = 0; }
            if (end === void 0) { end = 0; }
            var element = this.voices.get(index);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            var source = element.source;
            source.loop = true;
            source.loopStart = start;
            source.loopEnd = end;
            return exports.OperationResult.SUCCESS;
        };
        Mixdown.prototype.stopLoop = function (index) {
            var element = this.voices.get(index);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            var source = element.source;
            source.loop = false;
            source.loopStart = 0;
            source.loopEnd = 0;
            return exports.OperationResult.SUCCESS;
        };
        Mixdown.prototype.fadeTo = function (index, value, duration) {
            var element;
            if (index.kind === "voice") {
                element = this.voices.get(index);
            }
            else {
                element = this.streams.get(index);
            }
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            element.gain.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
            return exports.OperationResult.SUCCESS;
        };
        Mixdown.prototype.fadeOut = function (index, duration) {
            return this.fadeTo(index, 0.001, duration);
        };
        Mixdown.prototype.gain = function (index, value) {
            var element;
            if (index.kind === "voice") {
                element = this.voices.get(index);
            }
            else {
                element = this.streams.get(index);
            }
            if (!element || !element.gain) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            element.gain.gain.setValueAtTime(value, this.context.currentTime);
            return exports.OperationResult.SUCCESS;
        };
        Mixdown.prototype.balance = function (index, value) {
            var element;
            if (index.kind === "voice") {
                element = this.voices.get(index);
            }
            else {
                element = this.streams.get(index);
            }
            if (!element || !element.balance) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            element.balance.pan.setValueAtTime(value, this.context.currentTime);
            return exports.OperationResult.SUCCESS;
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
            if (!voice || !voice.source || !voice.gain || !voice.balance) {
                return;
            }
            voice.source.disconnect();
            voice.source.buffer = null;
            voice.gain.disconnect();
            voice.balance.disconnect();
            this.voices.remove(handle);
        };
        Mixdown.prototype.evictVoice = function (priority) {
            // we are going to nicely evict one of the currently playing sounds at
            // a lower priority, music is counted as never to be removed
            // right now we're just going to evict the first thing we come across
            // in the future we might want this to be more heuristic based 
            // (e.g. evict the quietest sound with the lowest priority)
            var voice = this.voices.findFirst(function (voice) { return voice.priority < priority; });
            if (voice === undefined || !voice.gain || !voice.source) {
                return false;
            }
            var ctx = this.context;
            // fade out then remove sound pointed too by handle
            voice.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + this.removalFadeDuration);
            voice.source.stop(ctx.currentTime + this.removalFadeDuration); // this triggers removal through callback
            return true;
        };
        return Mixdown;
    }());

    exports.Mixdown = Mixdown;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
