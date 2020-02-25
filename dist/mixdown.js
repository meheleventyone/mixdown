(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.mixdown = {}));
}(this, (function (exports) { 'use strict';

    /**
     * A [[GenerationalArena]] is a fixed size pool of values of type T. Access is controlled via
     * [[GenerationHandle|Generation Handles]]. These are valid so long as the element they point to
     *  has not been replaced since it was issued.
     *
     * This is useful to prevent accidental access and modification of elements that have changed by a stale index.
     * This allows handles to be kept with a guarentee that if the element has changed it cannot be accessed by an older
     * handle pointing to the same element. In effect weakly referencing values stored in the arena.
     *
     * A GenerationHandle holds two readonly numbers. The first is the index into the [[GernerationalArena]].
     * The second is the generation of element pointed to when the handle was generated.
     *
     * The main points of note is that these values should not be modified after they have been handed out. Nor should
     * users create these themselves. Nor should they pass handles from one arena into a different arena. Further data references
     * taken from the Arena should be treated as ephemeral and not stored elsewhere.
     *
     * For safety it can be a good idea to extend GenerationalHandle:
     * ```typescript
     * export class SpecificHandle extends GenerationHandle {
     *      constructor (index : number, generation : number) {
     *          super(index, generation);
     *      }
     * }
     * ```
     *
     * And then extend GenerationalArena:
     * ```typescript
     * class SpecificGenerationalArena<T> extends GenerationalArena<T, SpecificHandle> {
     *      constructor(size : number) {
     *          super(size, SpecificHandle);
     *      }
     * }
     * ```
     *
     * This results in an arena that can only take the SpecificHandle type as a valid handle.
     *
     * For convenience there exists [[SimpleGenerationalArena]] that provides this behavior for [[GenerationHandle]].
     *
     * @packageDocumentation
     */
    /**
     * GenerationalHandle stores readonly values representing an index into the [[GenerationalArena]] and the generation
     * that it is valid for.
     */
    class GenerationHandle {
        constructor(index, generation) {
            this.index = index;
            this.generation = generation;
        }
    }
    /**
     * GenerationalArena stores a number of items of type T that can be accessed through a handle of type H.
     *
     * Access via handles is policed such that handles to removed values are considered invalid.
     *
     * Data accessed via a handle should not be retained and should be treated as ephemeral.
     */
    class GenerationalArena {
        /**
         * Constructs a GenerationalArena.
         * @param size The number of items contained in the arena.
         * @param handleConstructor The constructor function for the handle (e.g. if H if GenerationalArena then pass in GenerationalArena).
         */
        constructor(size, handleConstructor) {
            this.generation = [];
            this.data = [];
            this.freeList = [];
            this.handleConstructor = handleConstructor;
            for (let i = 0; i < size; ++i) {
                this.generation[i] = 0;
                this.data[i] = undefined;
                this.freeList.push(i);
            }
        }
        /**
         * Adds an item of type T to the arena.
         * @param data The data to add.
         * @returns A handle of type H if the operation was successful or undefined if it failed.
         */
        add(data) {
            if (this.freeList.length === 0) {
                return undefined;
            }
            let index = this.freeList.pop();
            this.data[index] = data;
            return new this.handleConstructor(index, this.generation[index]);
        }
        /**
         * Returns the data represented by the handle passed in. This should not be retained and treated
         * as ephemeral.
         * @param handle The handle to retrieve data for.
         * @returns Either the data or undefined if the handle is now invalid.
         */
        get(handle) {
            if (handle.generation !== this.generation[handle.index]) {
                return undefined;
            }
            let index = handle.index;
            return this.data[index];
        }
        /**
         * Returns the first piece of data that meets the criteria specified by test.
         * @param test The function to test against.
         * @returns The data found or undefined. TODO: This should return a handle.
         */
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
        /**
         * Removes the data pointed to by handle.
         * @param handle The handle to remove.
         */
        remove(handle) {
            if (handle.generation !== this.generation[handle.index]) {
                return undefined;
            }
            let index = handle.index;
            this.generation[index] += 1;
            this.data[index] = undefined;
            this.freeList.push(index);
        }
        /**
         * Tests a handle to see if it is still valid.
         * @param handle The handle to test.
         * @returns True if valid, false otherwise.
         */
        valid(handle) {
            return handle.generation === this.generation[handle.index];
        }
        /**
         * @returns The number of free slots remaining.
         */
        numFreeSlots() {
            return this.freeList.length;
        }
        /**
         * @returns The number of slots used.
         */
        numUsedSlots() {
            return this.data.length - this.freeList.length;
        }
    }

    /**
     * A set of utility functions and classes to help work around deficiencies in the Safari WebAudio implementation.
     * @packageDocumentation
     */
    /**
     * Clamps a value to be within a lower and upper bound defined by min and max.
     * @param value The input value to clamp.
     * @param min The lower bound inclusive to clamp value to.
     * @param max The upper bound inclusive to clamp value to.
     * @returns The value clamped in the range min to max inclusive.
     */
    function clamp(value, min, max) {
        return Math.min(Math.max(min, value), max);
    }
    /**
     * MixdownStereoPanner is a wrapper over the cross-platform implementation details of StereoPannerNode.
     *
     * On Safari it represents the StereoPannerNode using the PannerNode using the 'equalpower' model.
     * To correctly pan the sound it is moved along the x-axis between -1 and 1 from left to right.
     * To keep the loudness equivalent for all positions as you would expect in purely stereo output the
     *  distance is kept at 1 unit by offsetting the sound forward along the z-axis by 1 - abs(panValue).
     *
     * On other platforms it uses the standard StereoPannerNode.
     *
     * Note: On Safari this is probably not going to mix well with anything that moves
     * the listener position around, at that point we would need to adjust all
     * MixdownStereoPanner nodes to be offset from that position
     */
    class MixdownStereoPanner {
        /**
         *
         * @param context The AudioContext that [[Mixdown]] is using.
         */
        constructor(context) {
            /**
              * @ignore
              * */
            this._pan = 0;
            if (!context.createStereoPanner) {
                this._panner = { kind: "safari", panner: context.createPanner() };
                this._panner.panner.panningModel = 'equalpower';
            }
            else {
                this._panner = { kind: "stereopanner", stereoPanner: context.createStereoPanner() };
            }
        }
        /**
         *  @returns The current value of the pan property.
         */
        get pan() {
            return this._pan;
        }
        /**
         * @param value The value to set pan to in the underlying implementation. This is clamped in the range -1 to 1 inclusive.
         */
        set pan(value) {
            this._pan = clamp(value, -1, 1);
            if (this._panner.kind === "stereopanner") {
                this._panner.stereoPanner.pan.value = this._pan;
                return;
            }
            // we want to set the pan position to the correct offset whilst remaining equidistant from the listener
            // hence moving the z position to keep the sound a length of 1 from the listener, otherwise it would get louder
            // in the middle than at the sides
            this._panner.panner.setPosition(this._pan, 0, 1 - Math.abs(this._pan));
        }
        /**
         * @returns A reference to the AudioNode being used by the underlying implementation.
         */
        getAudioNode() {
            if (this._panner.kind === "stereopanner") {
                return this._panner.stereoPanner;
            }
            else {
                return this._panner.panner;
            }
        }
    }

    /**
     * A Web Audio based mixer for games.
     * @packageDocumentation
     */
    (function (Priority) {
        Priority[Priority["Low"] = 0] = "Low";
        Priority[Priority["Medium"] = 1] = "Medium";
        Priority[Priority["High"] = 2] = "High";
    })(exports.Priority || (exports.Priority = {}));
    /**
     * A Bank contains a collection of [[Definable]] items that constitute a set of sounds and mixers that belong together.
     *
     * Typically you don't want to create one yourself but rather use the [[BankBuilder]].
     */
    class Bank {
        constructor() {
            this.assets = [];
            this.sounds = [];
            this.streams = [];
            this.mixers = [];
        }
        /**
         * Finds a [[Definable]] by name if you know the type of the item it's faster to use the specific accessor.
         * @param name The name of the [[Definable]] to find.
         * @returns The [[Definable]] or undefined if the name does not exist in the bank.
         */
        get(name) {
            var _a, _b, _c, _d;
            return _d = (_c = (_b = (_a = this.getAssetDefinition(name), (_a !== null && _a !== void 0 ? _a : this.getSoundDefinition(name))), (_b !== null && _b !== void 0 ? _b : this.getStreamDefinition(name))), (_c !== null && _c !== void 0 ? _c : this.getMixerDefinition(name))), (_d !== null && _d !== void 0 ? _d : undefined);
        }
        /**
         * Finds an [[AssetDefinition]] by name.
         * @param name The name of the definition to find.
         * @returns The [[AssetDefinition]] or undefined if the name does not exist in the bank.
         */
        getAssetDefinition(name) {
            return this.assets.find((item) => item.name === name);
        }
        /**
         * Finds a [[SoundDefinition]] by name.
         * @param name The name of the definition to find.
         * @returns The [[SoundDefinition]] or undefined if the name does not exist in the bank.
         */
        getSoundDefinition(name) {
            return this.sounds.find((item) => item.name === name);
        }
        /**
         * Finds a [[StreamDefinition]] by name.
         * @param name The name of the definition to find.
         * @returns The [[StreamDefinition]] or undefined if the name does not exist in the bank.
         */
        getStreamDefinition(name) {
            return this.streams.find((item) => item.name === name);
        }
        /**
         * Finds a [[MixerDefinition]] by name.
         * @param name The name of the definition to find.
         * @returns The [[MixerDefinition]] or undefined if the name does not exist in the bank.
         */
        getMixerDefinition(name) {
            return this.mixers.find((item) => item.name === name);
        }
    }
    /**
     * The BankBuilder is used to create a [[Bank]] in a declarative manner.
     */
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
        /**
         * Add's a [[Definable]] to the [[Bank]].
         * @param definition The [[Definable]] to add.
         */
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
        /**
         * Creates an [[AssetDefinition]] and adds it to the [[Bank]].
         * @param name A string by which the [[AssetDefinition]] can later be referred.
         * @param source A URL from which the asset will be loaded.
         */
        createAssetDefinition(name, source) {
            const asset = { kind: "asset", name: name, source: source };
            this.add(asset);
        }
        /**
         * Creates a [[SoundDefinition]] and adds it to the [[Bank]].
         * @param name A string by which the [[SoundDefinition]] can later be referred.
         * @param priority A [[Priority]] for the sound.
         * @param asset The name of the [[AssetDefinition]] that is used by this sound.
         * @param gain The starting gain of this sound.
         * @param loop Optional [[SoundLoop]] metadata.
         * @param clip Optional [[SoundClip]] metadata.
         * @param mixer Optional name of a [[Mixer]] this sound should play through.
         */
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
        /**
         * Creates a [[StreamDefinition]] and adds it to the [[Bank]]
         * @param name A string by which this [[StreamDefinition]] may later be referred.
         * @param source The URL the sound will be streamed from.
         * @param gain The starting gain value.
         * @param mixer Optional name of the [[Mixer]] this sound will be played through.
         */
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
        /**
         * Creates a [[MixerDefinition]] and adds it to the [[Bank]].
         * @param name A string by which this [[MixerDefinition]] may later be referred.
         * @param gain The starting gain value for the [[Mixer]].
         * @param parent Optional name of the parent Mixer for this instance.
         */
        createMixerDefinition(name, gain, parent) {
            const mixer = {
                kind: "mixer",
                name: name,
                parent: parent,
                gain: gain
            };
            this.add(mixer);
        }
        /**
         * This function allows the user to make sure a [[Bank]] meets the requirements of [[Mixdown]].
         */
        static validate(bank) {
            let valid = true;
            // check all sounds reference valid asset names
            // and valid mixers
            for (let i = 0; i < bank.sounds.length; ++i) {
                const soundDef = bank.sounds[i];
                const assetDef = bank.getAssetDefinition(soundDef.asset);
                if (!assetDef) {
                    console.warn("Bank Validation Issue: Sound %s references missing Asset %s", soundDef.name, soundDef.asset);
                    valid = false;
                }
                if (!soundDef.mixer) {
                    break;
                }
                const mixerDef = bank.getMixerDefinition(soundDef.mixer);
                if (!mixerDef) {
                    console.warn("Bank Validation Issue: Sound %s references missing Mixer %s", soundDef.name, soundDef.mixer);
                    valid = false;
                }
            }
            // check mixers are valid
            for (let i = 0; i < bank.streams.length; ++i) {
                const streamDef = bank.streams[i];
                if (!streamDef.mixer) {
                    break;
                }
                const mixerDef = bank.getMixerDefinition(streamDef.mixer);
                if (!mixerDef) {
                    console.warn("Bank Validation Issue: Stream %s references missing Mixer %s", streamDef.name, streamDef.mixer);
                    valid = false;
                }
            }
            // check parents are valid
            for (let i = 0; i < bank.mixers.length; ++i) {
                const mixerDef = bank.mixers[i];
                if (!mixerDef.parent) {
                    continue;
                }
                const parentDef = bank.getMixerDefinition(mixerDef.parent);
                if (!parentDef) {
                    console.warn("Bank Validation Issue: Mixer %s references missing parent Mixer %s", mixerDef.name, mixerDef.parent);
                    valid = false;
                }
            }
            return valid;
        }
    }
    (function (LoadBankError) {
        LoadBankError[LoadBankError["BANK_VALIDATION_FAIL"] = 0] = "BANK_VALIDATION_FAIL";
    })(exports.LoadBankError || (exports.LoadBankError = {}));
    (function (OperationResult) {
        OperationResult[OperationResult["SUCCESS"] = 0] = "SUCCESS";
        OperationResult[OperationResult["DOES_NOT_EXIST"] = 1] = "DOES_NOT_EXIST";
    })(exports.OperationResult || (exports.OperationResult = {}));
    class VoiceGenerationHandle extends GenerationHandle {
        constructor(index, generation) {
            super(index, generation);
            this.kind = "voice";
        }
    }
    class StreamGenerationHandle extends GenerationHandle {
        constructor(index, generation) {
            super(index, generation);
            this.kind = "stream";
        }
    }
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
            var _a;
            this.assetMap = {};
            this.mixerMap = {};
            this.removalFadeDuration = 0.2;
            // hack: use of any as a fix for safari having old names
            const audioContextConstructor = (_a = window.AudioContext, (_a !== null && _a !== void 0 ? _a : window.webkitAudioContext));
            if (!audioContextConstructor) {
                throw new Error("Mixdown: Could not find a valid AudioContext constructor.");
            }
            this.context = new audioContextConstructor();
            this.maxSounds = maxSounds;
            this.slopSize = slopSize;
            this.masterMixer = new Mixer(this.context, "master");
            this.masterMixer.gainNode.connect(this.context.destination);
            // technically we'll have more playing power than maxSounds would
            // suggest but will consider the voices and streams a union and never
            // exceed maxSounds things playing together
            this.voices = new GenerationalArena(maxSounds, VoiceGenerationHandle);
            this.streams = new GenerationalArena(maxStreams, StreamGenerationHandle);
        }
        loadAsset(name, path) {
            // todo: make sure we're loading a format the browser supports
            // todo: xmlhttprequest for backwards compat?
            // hack: safari doesn't support the promise version of decodeAudioData so promisify the callback version
            const decodeAudioData = (data) => {
                return new Promise((resolve, reject) => {
                    this.context.decodeAudioData(data, (buffer) => resolve(buffer), (reason) => reject(reason));
                });
            };
            return new Promise((resolve, reject) => {
                fetch(path)
                    .then(response => response.arrayBuffer())
                    .then(data => decodeAudioData(data))
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
        loadBank(bank) {
            this.unloadBank();
            if (!BankBuilder.validate(bank)) {
                return { kind: "error", error: exports.LoadBankError.BANK_VALIDATION_FAIL };
            }
            this.bank = bank;
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
            const balance = this.createStereoPanner();
            const balanceAudioNode = balance.getAudioNode();
            source.connect(balanceAudioNode);
            let gain = ctx.createGain();
            balanceAudioNode.connect(gain);
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
            const balance = this.createStereoPanner();
            const balanceAudioNode = balance.getAudioNode();
            source.connect(balanceAudioNode);
            let gain = ctx.createGain();
            balanceAudioNode.connect(gain);
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
                // todo: this is technically naughty, should have some kind of enumeration
                var handle = new StreamGenerationHandle(i, this.streams.generation[i]);
                let stream = this.streams.get(handle);
                if (!stream) {
                    continue;
                }
                stream.source.disconnect();
                stream.gain.disconnect();
                stream.balance.getAudioNode().disconnect();
                stream.audio.pause();
                this.streams.remove(handle);
            }
        }
        stop(handle) {
            if (handle.kind === "voice") {
                return this.stopSound(handle);
            }
            else {
                return this.stopStream(handle);
            }
        }
        stopSound(handle) {
            const voice = this.voices.get(handle);
            if (!voice) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            if (voice.source.loop && voice.playOut) {
                this.stopLoop(handle);
            }
            else {
                voice.source.stop();
            }
            return exports.OperationResult.SUCCESS;
        }
        stopStream(handle) {
            const stream = this.streams.get(handle);
            if (!stream) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            stream.source.disconnect();
            stream.gain.disconnect();
            stream.balance.getAudioNode().disconnect();
            stream.audio.pause();
            this.streams.remove(handle);
            return exports.OperationResult.SUCCESS;
        }
        loop(handle, start, end) {
            let element = this.voices.get(handle);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            const source = element.source;
            source.loop = true;
            if (start) {
                source.loopStart = start;
            }
            if (end) {
                source.loopEnd = end;
            }
            return exports.OperationResult.SUCCESS;
        }
        stopLoop(handle) {
            let element = this.voices.get(handle);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            const source = element.source;
            source.loop = false;
            source.loopStart = 0;
            source.loopEnd = 0;
            return exports.OperationResult.SUCCESS;
        }
        fadeTo(handle, value, duration) {
            let element = this.getElement(handle);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            // ramp dislikes stuff in the range of ±1.40130e-45, at least in chrome
            if (value < 1.40130e-45) {
                value = 0.001;
            }
            element.gain.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
            return exports.OperationResult.SUCCESS;
        }
        fadeOut(handle, duration) {
            return this.fadeTo(handle, 0, duration);
        }
        fadeOutAndRemove(handle, duration) {
            var _a;
            const fadeResult = this.fadeOut(handle, duration);
            if (fadeResult !== exports.OperationResult.SUCCESS) {
                return fadeResult;
            }
            if (handle.kind === "voice") {
                const voice = this.voices.get(handle);
                (_a = voice) === null || _a === void 0 ? void 0 : _a.source.stop(this.context.currentTime + duration);
            }
            else {
                setTimeout(() => this.stopStream(handle), duration * 1000); // lack of accuracy of setTimeout might be an issue
            }
            return fadeResult;
        }
        gain(handle, value) {
            let element = this.getElement(handle);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            element.gain.gain.setValueAtTime(value, this.context.currentTime);
            return exports.OperationResult.SUCCESS;
        }
        balance(handle, value) {
            let element = this.getElement(handle);
            if (!element) {
                return exports.OperationResult.DOES_NOT_EXIST;
            }
            element.balance.pan = value;
            return exports.OperationResult.SUCCESS;
        }
        numFreeSlots() {
            return this.voices.numFreeSlots() - this.streams.numUsedSlots();
        }
        getBuffer(assetName) {
            return this.assetMap[assetName];
        }
        isPlaying(handle) {
            let element = this.getElement(handle);
            return element !== undefined;
        }
        createStereoPanner() {
            // hack: safari doesn't support the stereopanner node
            return new MixdownStereoPanner(this.context);
        }
        getElement(handle) {
            let element = undefined;
            if (handle.kind === "voice") {
                element = this.voices.get(handle);
            }
            else {
                element = this.streams.get(handle);
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
            voice.balance.getAudioNode().disconnect();
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

    exports.Bank = Bank;
    exports.BankBuilder = BankBuilder;
    exports.Mixdown = Mixdown;
    exports.Mixer = Mixer;
    exports.StreamGenerationHandle = StreamGenerationHandle;
    exports.VoiceGenerationHandle = VoiceGenerationHandle;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
