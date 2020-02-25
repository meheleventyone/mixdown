/**
 * A Web Audio based mixer for games.
 * @packageDocumentation
 */

import { GenerationHandle, GenerationalArena } from "./GenerationalArena";
import { Result, Optional } from "./Utility";
import { MixdownStereoPanner } from "./SafariHacks";

/**
 * The priority of the [[SoundDefinition]]. Higher priority sounds will replace lower priority sounds.
 */
export enum Priority {
    Low = 0,
    Medium,
    High
}

/**
 * Metadata for sound looping. If set to play in the sound will play the part of sound before the loop start
 *  point and then loop. If set to play out when the sound is stopped it will play the part of the sound
 * after the loop end point before it was stopped.
 */
export interface SoundLoop {
    playIn : boolean;
    playOut : boolean;
}

/**
 * Sets the start and end points in seconds to define a sound clip. SoundClip is used for loops and one shot clips.
 */
export interface SoundClip {
    start : number;
    end : number;
}

/**
 * A SoundDefinition is the definition for sounds that should be played from assets loaded
 * into memory from [[AssetDefinition]]s.
 * 
 * Each SoundDefinition is defined as:
 * * __name__ - A string by which the definition can later be referred.
 * * __priority__ - A [[Priority]] for the sound.
 * * __asset__ - The string name of an [[AssetDefinition]].
 * * __gain__ - The default gain to be set to play this SoundDefinition.
 * * __loop__ - A [[SoundLoop]]. An optional piece of metadata to define how looping will behave.
 * * __clip__ - A [[SoundClip]]. An optional piece of metadata that defines start and end points for the clip or loop.
 * * __mixer__ - The string name of an optional [[MixerDefinition]] to play this sound through. This means the sound
 * will play through the specified [[Mixer]].
 */
export interface SoundDefinition {
    kind : "sound";
    name : string;
    priority : Priority;
    asset : string;
    gain : number;
    loop? : SoundLoop;
    clip? : SoundClip;
    mixer? : string;
}

/**
 * A StreamDefinition defines sounds that should be streamed rather than loaded into memory. This trades some immediecy
 * of playback for lower memory overhead and is most useful for playing music and other long running sounds.
 * 
 * Each StreamDefinition contains:
 * * __name__ - A string by which the definition can later be referred.
 * * __source__ - The source URL from which the streaming audio will be played.
 * * __gain__ - The starting gain for the audio.
 * * __mixer__ - The string name of an optional [[MixerDefinition]] to play this sound through. This means the sound will
 * be piped through the specified [[Mixer]].
 */
export interface StreamDefinition {
    kind : "stream";
    name : string;
    source : string;
    gain : number;
    mixer? : string;
}

/**
 * A MixerDefinition defines a [[Mixer]] which is a node based means of manipulating sounds as groups. Multiple Mixers and
 * sounds can be piped through a Mixer which in turn can pipe itself to another Mixer.
 * 
 * Each MixerDefinition contains:
 * * __name__ - A string by which the [[Mixer]] can later be referred.
 * * __gain__ - The starting gain of the Mixer.
 * * __parent__ - An optional string name of the [[Mixer]] to which this definition should be parented.
 */
export interface MixerDefinition {
    kind : "mixer";
    name : string;
    gain : number;
    parent? : string;
}

/**
 * An AssetDefinition defines an asset that will be loaded into memory.
 * 
 * Each AssetDefinition contains:
 * * __name__ - A string by which the AssetDefinition can later be referred.
 * * __source__ - A URL to the asset to be loaded.
 */
export interface AssetDefinition {
    kind : "asset";
    name : string;
    source : string;
}

/**
 * A Definable is the union of the different definition types.
 */
type Definable = AssetDefinition | SoundDefinition | StreamDefinition | MixerDefinition;

/**
 * A Bank contains a collection of [[Definable]] items that constitute a set of sounds and mixers that belong together.
 * 
 * Typically you don't want to create one yourself but rather use the [[BankBuilder]].
 */
export class Bank {
    assets : AssetDefinition[] = [];
    sounds : SoundDefinition[] = [];
    streams  : StreamDefinition[] = [];
    mixers : MixerDefinition[] = [];

    /**
     * Finds a [[Definable]] by name if you know the type of the item it's faster to use the specific accessor.
     * @param name The name of the [[Definable]] to find.
     * @returns The [[Definable]] or undefined if the name does not exist in the bank.
     */
    get(name : string) : Definable | undefined {
        return this.getAssetDefinition(name) ?? 
               this.getSoundDefinition(name) ?? 
               this.getStreamDefinition(name) ?? 
               this.getMixerDefinition(name) ?? undefined;
    }

    /**
     * Finds an [[AssetDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[AssetDefinition]] or undefined if the name does not exist in the bank.
     */
    getAssetDefinition (name : string) : AssetDefinition | undefined {
        return this.assets.find((item) => item.name === name);
    }

    /**
     * Finds a [[SoundDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[SoundDefinition]] or undefined if the name does not exist in the bank.
     */
    getSoundDefinition (name : string) : SoundDefinition | undefined {
        return this.sounds.find((item) => item.name === name);
    }

    /**
     * Finds a [[StreamDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[StreamDefinition]] or undefined if the name does not exist in the bank.
     */
    getStreamDefinition (name : string) : StreamDefinition | undefined {
        return this.streams.find((item) => item.name === name);
    }

    /**
     * Finds a [[MixerDefinition]] by name.
     * @param name The name of the definition to find.
     * @returns The [[MixerDefinition]] or undefined if the name does not exist in the bank.
     */
    getMixerDefinition (name : string) : MixerDefinition | undefined {
        return this.mixers.find((item) => item.name === name);
    }
}

/**
 * The BankBuilder is used to create a [[Bank]] in a declarative manner.
 */
export class BankBuilder {
    /** The Bank to be manipulated. */
    bank : Bank;

    constructor () {
        this.bank = new Bank();
    }

    private getBank(definition : Definable) : Definable[] | undefined {
        switch(definition.kind) {
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
    add(definition : Definable) {
        const definitionStore = this.getBank(definition);
        const index = definitionStore?.findIndex((item) => item.name === definition.name);
        if (index !== -1) {
            console.warn("Attempting to add existing name %s as a %s", definition.name, definition.kind);
            return;
        }
        definitionStore?.push(definition);
    }

    /**
     * Creates an [[AssetDefinition]] and adds it to the [[Bank]].
     * @param name A string by which the [[AssetDefinition]] can later be referred.
     * @param source A URL from which the asset will be loaded.
     */
    createAssetDefinition (name : string, source : string) {
        const asset : AssetDefinition = {kind: "asset", name: name, source: source};
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
    createSoundDefinition (name : string, priority : Priority, asset : string, gain : number, loop? : SoundLoop, clip? : SoundClip, mixer? : string) {
        const sound : SoundDefinition = {
            kind: "sound",
            name: name,
            priority : priority,
            asset : asset,
            gain : gain,
            loop : loop,
            clip : clip,
            mixer : mixer
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
    createStreamDefinition (name : string, source : string, gain : number, mixer? : string) {
        const stream : StreamDefinition = {
            kind : "stream",
            name : name,
            source : source,
            gain : gain,
            mixer : mixer
        };
        this.add(stream);
    }

    /**
     * Creates a [[MixerDefinition]] and adds it to the [[Bank]].
     * @param name A string by which this [[MixerDefinition]] may later be referred.
     * @param gain The starting gain value for the [[Mixer]].
     * @param parent Optional name of the parent Mixer for this instance.
     */
    createMixerDefinition (name : string, gain : number, parent? : string) {
        const mixer : MixerDefinition = {
            kind : "mixer",
            name : name,
            parent : parent,
            gain : gain
        }
        this.add(mixer);
    }

    /**
     * This function allows the user to make sure a [[Bank]] meets the requirements of [[Mixdown]].
     */
    static validate (bank : Bank) : boolean {
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

/**
 * The union of [[Definable]]s that can be played directly.
 */
export type Playable = SoundDefinition | StreamDefinition;

/** 
 * Error enum for [[Mixdown]] failing to load a [[Bank]].
*/
export enum LoadBankError {
    BANK_VALIDATION_FAIL,
}

/** 
 * Result enum for many [[Mixdown]] operations that utilise handles.
*/
export enum OperationResult {
    SUCCESS = 0,
    DOES_NOT_EXIST,
}

/**
 * A type representing a playing [[SoundDefinition]].
 */
interface Voice {
    gain : GainNode;
    balance : MixdownStereoPanner;
    source : AudioBufferSourceNode;
    priority : Priority;
    playOut : boolean;
}

/**
 * A type representing a playing [[StreamDefinition]].
 */
interface Stream {
    gain: GainNode;
    balance: MixdownStereoPanner;
    source: MediaElementAudioSourceNode;
    audio: HTMLAudioElement;
}

/**
 * A handle representing a playing [[SoundDefinition]].
 */
export class VoiceGenerationHandle extends GenerationHandle {
    kind : "voice";

    constructor (index : number, generation : number) {
        super(index, generation);

        this.kind = "voice";
    }
}

/**
 * A handle representing a playing [[StreamDefinition]].
 */
export class StreamGenerationHandle extends GenerationHandle {
    kind : "stream";

    constructor (index : number, generation : number) {
        super(index, generation);

        this.kind = "stream";
    }
}

/**
 * A Mixer represents a node in a hierarchy of sounds and other Mixers. It can be parented to one Mixer
 * and can have one or more sounds and Mixers parented to it. Audio flows down through the hierarchy with each
 * Mixer effecting the resultant output.
 * 
 * Right now Mixers are pretty boring and allow only manipulation of gain. But this is enough to do some interesting
 * segregation of sounds to allow things like adjustable gain for categories like music, sfx, dialogue and ui. They can
 * also be used to automate things like ducking of sounds for example to add emphasis to one particular sound effect.
 * 
 * In the future I hope to expand them further to do more interesting things and open them for extension by users.
 */
export class Mixer {
    context : AudioContext;
    gainNode : GainNode;
    parent : Mixer | undefined;
    name : string;

    constructor(context : AudioContext, name : string, parent? : Mixer | Mixdown) {
        this.context = context;
        this.gainNode = context.createGain();
        this.name = name;
        if (parent) {
            this.connect(parent);
        }
    }

    connect(to : Mixer | Mixdown) {
        if (to instanceof Mixdown) {
            to.masterMixer.connect(this);
            return;
        }

        this.gainNode.connect(to.gainNode);
    }

    disconnect() {
        this.gainNode.disconnect();
    }

    gain(value : number) {
        this.gainNode.gain.setValueAtTime(value, this.context.currentTime);
    }

    fadeTo(value : number, duration : number) {
        // ramp dislikes stuff in the range of ±1.40130e-45, at least in chrome
        if (value < 1.40130e-45) {
            value = 0.001;
        }
        this.gainNode.gain.exponentialRampToValueAtTime(value, this.context.currentTime + duration);
    }

    fadeOut(duration : number) {
        this.fadeTo(0, duration);
    }
}

export class Mixdown {
    context : AudioContext;

    bank : Bank | undefined;
    assetMap : Record<string, AudioBuffer | undefined> = {};

    maxSounds : number;
    slopSize : number;

    mixerMap : Record<string, Mixer | undefined> = {};
    masterMixer : Mixer;

    voices : GenerationalArena<Voice, VoiceGenerationHandle>;
    streams : GenerationalArena<Stream, StreamGenerationHandle>;
    removalFadeDuration : number = 0.2;

    constructor(maxSounds : number = 32, maxStreams = 2, slopSize : number = 4) {
        // hack: use of any as a fix for safari having old names
        const audioContextConstructor = window.AudioContext ?? (window as any).webkitAudioContext;

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

    loadAsset(name : string, path : string) : Promise<boolean> {
        // todo: make sure we're loading a format the browser supports
        // todo: xmlhttprequest for backwards compat?

        // hack: safari doesn't support the promise version of decodeAudioData so promisify the callback version
        const decodeAudioData = (data : ArrayBuffer) => { return new Promise<AudioBuffer>((resolve, reject) => {
            this.context.decodeAudioData(data, (buffer) => resolve(buffer), (reason) => reject(reason));
        }); }

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

    unloadBank () {
        if (!this.bank) {
            return;
        }

        this.stopAll();
        this.assetMap = {};

        var mixerNames = Object.keys(this.mixerMap);
        for (let i = 0; i < mixerNames.length; ++i) {
            this.mixerMap[mixerNames[i]]?.disconnect();
        }

        this.mixerMap = {};

        this.bank = undefined;
    }

    loadBank (bank : Bank) : Result<Promise<boolean[]>, LoadBankError> {
        this.unloadBank();

        if (!BankBuilder.validate(bank)) {
            return {kind: "error", error: LoadBankError.BANK_VALIDATION_FAIL};
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

        var assetPromises : Promise<boolean>[] = [];
        for (let i = 0; i < this.bank.assets.length; ++i) {
            var assetDef = this.bank.assets[i];
            var promise = this.loadAsset(assetDef.name, assetDef.source);
            assetPromises.push(promise);
        }

        return {kind: "value", value: Promise.all(assetPromises)};
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

    addMixer(mixer : Mixer) : boolean {
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

    getMixer(name : string) : Optional<Mixer> {
        return this.mixerMap[name];
    }

    getSoundDef(name : string) : Optional<SoundDefinition> {
        return this.bank?.getSoundDefinition(name);
    }

    getStreamDef(name : string) : Optional<StreamDefinition> {
        return this.bank?.getStreamDefinition(name);
    }

    play(name : string, optionalMixer? : string) : Optional<VoiceGenerationHandle | StreamGenerationHandle> {
        let playable : Playable | undefined = this.getSoundDef(name);
        if (playable) {
            return this.playSoundDef(playable, optionalMixer); 
        }

        playable = this.getStreamDef(name);

        if (!playable) {
            return undefined;
        }
        return this.playStreamDef(playable, optionalMixer);
    }

    playSound(name : string, optionalMixer? : string) : Optional<VoiceGenerationHandle> {
        const soundDef = this.getSoundDef(name);
        if (!soundDef) {
            return undefined;
        }
        return this.playSoundDef(soundDef, optionalMixer);
    }

    playStream(name : string, optionalMixer? : string) : Optional<StreamGenerationHandle> {
        const streamDef = this.getStreamDef(name);
        if (!streamDef) {
            return undefined;
        }
        return this.playStreamDef(streamDef, optionalMixer);
    }

    playPlayable(playable : Playable, optionalMixer? : string) : Optional<VoiceGenerationHandle | StreamGenerationHandle> {
        switch (playable.kind) {
            case "sound":
                return this.playSoundDef(playable, optionalMixer);
            case "stream":
                return this.playStreamDef(playable, optionalMixer);
        }
    }

    playSoundDef(sound : SoundDefinition, optionalMixer? : string) : Optional<VoiceGenerationHandle> {
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

        var mixerName = optionalMixer ?? sound.mixer;
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
        } else {
            source.start(0, start);
        }
    
        let playOut = sound.loop ? sound.loop.playOut : false
        let handle = this.voices.add({gain : gain, balance : balance, source : source, priority : sound.priority, playOut: playOut});

        if (!handle) {
            return undefined;
        }

        let voiceHandle : VoiceGenerationHandle = { kind : "voice", index : handle.index, generation : handle.generation};
        source.onended = () => { this.voiceEnded(voiceHandle); }

        return voiceHandle;
    }

    playStreamDef(stream : StreamDefinition, optionalMixer? : string) : Optional<StreamGenerationHandle> {
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

        var mixerName = optionalMixer ?? stream.mixer;
        var mixer = mixerName ? this.getMixer(mixerName) : this.masterMixer;
        if (mixer) {
            gain.connect(mixer.gainNode);
        }

        let handle = this.streams.add({gain : gain, balance : balance, source : source, audio: audio});

        if (!handle) {
            return undefined;
        }

        let streamHandle : StreamGenerationHandle = { kind : "stream", index : handle.index, generation : handle.generation};

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
            var handle : StreamGenerationHandle = new StreamGenerationHandle(i,this.streams.generation[i]);
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

    stop(handle : VoiceGenerationHandle | StreamGenerationHandle) : OperationResult {
        if (handle.kind === "voice") {
            return this.stopSound(handle);
        } else {
            return this.stopStream(handle);
        }
    }

    stopSound(handle : VoiceGenerationHandle) : OperationResult {
        const voice = this.voices.get(handle);

        if (!voice) {
            return OperationResult.DOES_NOT_EXIST;
        }

        if (voice.source.loop && voice.playOut) {
            this.stopLoop(handle);
        } else {
            voice.source.stop();
        }
        
        return OperationResult.SUCCESS;
    }

    stopStream(handle : StreamGenerationHandle) : OperationResult {
        const stream = this.streams.get(handle);

        if (!stream) {
            return OperationResult.DOES_NOT_EXIST;
        }

        stream.source.disconnect();
        stream.gain.disconnect();
        stream.balance.getAudioNode().disconnect();
        stream.audio.pause();
        
        this.streams.remove(handle);

        return OperationResult.SUCCESS;
    }

    loop(handle : VoiceGenerationHandle, start? : number, end? : number) : OperationResult {
        let element = this.voices.get(handle);

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

    stopLoop(handle : VoiceGenerationHandle) : OperationResult {
        let element = this.voices.get(handle);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        const source = element.source;
        source.loop = false;
        source.loopStart = 0;
        source.loopEnd = 0;
        return OperationResult.SUCCESS;
    }

    fadeTo(handle : VoiceGenerationHandle | StreamGenerationHandle, value : number, duration : number) : OperationResult {
        let element = this.getElement(handle);

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

    fadeOut(handle : VoiceGenerationHandle | StreamGenerationHandle, duration : number) : OperationResult {
        return this.fadeTo(handle, 0, duration);
    }

    fadeOutAndRemove(handle : VoiceGenerationHandle | StreamGenerationHandle, duration : number) : OperationResult {
        const fadeResult = this.fadeOut(handle, duration);

        if (fadeResult !== OperationResult.SUCCESS) {
            return fadeResult;
        }

        if (handle.kind === "voice") {
            const voice = this.voices.get(handle);
            voice?.source.stop(this.context.currentTime + duration);
        } else {
            setTimeout(() => this.stopStream(handle), duration * 1000); // lack of accuracy of setTimeout might be an issue
        }

        return fadeResult;
    }

    gain(handle : VoiceGenerationHandle | StreamGenerationHandle, value : number) : OperationResult {
        let element = this.getElement(handle);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.gain.gain.setValueAtTime(value, this.context.currentTime);
        return OperationResult.SUCCESS;
    }

    balance(handle : VoiceGenerationHandle | StreamGenerationHandle, value : number) : OperationResult {
        let element = this.getElement(handle);

        if (!element) {
            return OperationResult.DOES_NOT_EXIST;
        }

        element.balance.pan = value;
        return OperationResult.SUCCESS;
    }

    numFreeSlots() : number {
        return this.voices.numFreeSlots() - this.streams.numUsedSlots();
    }

    getBuffer(assetName : string) : AudioBuffer | undefined {
        return this.assetMap[assetName];
    }

    isPlaying(handle : VoiceGenerationHandle | StreamGenerationHandle) : boolean {
        let element = this.getElement(handle);
        return element !== undefined;
    }

    private createStereoPanner() : MixdownStereoPanner {
        // hack: safari doesn't support the stereopanner node
        return new MixdownStereoPanner(this.context);
    }

    private getElement(handle : VoiceGenerationHandle | StreamGenerationHandle) : Optional<Voice | Stream> {
        let element : Voice | Stream | undefined = undefined;
        if (handle.kind === "voice") {
            element = this.voices.get(handle);
        } else {
            element = this.streams.get(handle);
        }
        return element;
    }

    private voiceEnded(handle : VoiceGenerationHandle) {
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

    private evictVoice(priority : number) : boolean {
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