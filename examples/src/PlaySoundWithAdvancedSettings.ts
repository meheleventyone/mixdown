import {Mixdown, Priority, VoiceGenerationHandle, Sound, SoundLoop, SoundClip} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav");

let soundId : VoiceGenerationHandle | undefined =  undefined;

let gain = 1;

let balance = 0;

let clip = false;
let clipStart = 0;
let clipEnd = 0;

let loop = false;
let loopStart = 0;
let loopEnd = 0;

function play() {
    // todo check if need to resume
    mixdown.resume();
    let sound : Sound = {
        kind: "sound",
        asset: "twang",
        gain: gain,
        priority: Priority.High
    };

    if (loop) {
        sound.loop = {
            start: loopStart,
            end: loopEnd
        };
    }

    if (clip) {
        sound.clip = {
            start: clipStart,
            end: clipEnd
        }
    }
    soundId = mixdown.playSound(sound);
}

function stop() {
    if (!soundId) {
        return;
    }

    mixdown.stop(soundId);
}

function getEventFloatValue(event : Event) : number {
    return parseFloat((event.currentTarget as HTMLInputElement).value);
}

function gainChanged(event : Event) {
    gain = getEventFloatValue(event);
    if (soundId) {
        mixdown.gain(soundId, gain);
    }
}

function balanceChanged(event : Event) {
    balance = getEventFloatValue(event);
    if (soundId) {
        mixdown.balance(soundId, balance);
    }
}

function clipChanged(event: Event) {
    clip = (event.currentTarget as HTMLInputElement).checked;
}

function clipStartChanged(event: Event) {
    clipStart =  getEventFloatValue(event);
}

function clipEndChanged(event: Event) {
    clipEnd =  getEventFloatValue(event);    
}

function loopChanged(event: Event) {
    loop = (event.currentTarget as HTMLInputElement).checked;

    if (!soundId) {
        return;
    }

    if (loop) {
        mixdown.loop(soundId, loopStart, loopEnd);
    } else {
        // todo check playing
        mixdown.stopLoop(soundId);
    }
}

function loopStartChanged(event: Event) {
    loopStart = getEventFloatValue(event);

    if (!loop || !soundId) {
        return;
    }

    // todo check playing
    mixdown.loop(soundId, loopStart, loopEnd);
}

function loopEndChanged(event: Event) {
    loopEnd = getEventFloatValue(event);

    if (!loop || !soundId) {
        return;
    }

    // todo check playing
    mixdown.loop(soundId, loopStart, loopEnd);
}

const playButton = document.getElementById("playsound");
if (playButton) {
    playButton.addEventListener("click", play);
}

const stopButton = document.getElementById("stopsound");
if (stopButton) {
    stopButton.addEventListener("click", stop);
}

const gainSlider = document.getElementById("gain");
if (gainSlider) {
    gainSlider.addEventListener("input", gainChanged);
}

const balanceSlider = document.getElementById("balance");
if (balanceSlider) {
    balanceSlider.addEventListener("input", balanceChanged);
}

const clipCheckbox = document.getElementById("clip");
if (clipCheckbox) {
    clipCheckbox.addEventListener("input", clipChanged);
}

const clipStartSlider = document.getElementById("clipstart");
if (clipStartSlider) {
    clipStartSlider.addEventListener("input", clipStartChanged);
}

const clipEndSlider = document.getElementById("clipend");
if (clipEndSlider) {
    clipEndSlider.addEventListener("input", clipEndChanged);
}

const loopCheckbox = document.getElementById("loop");
if (loopCheckbox) {
    loopCheckbox.addEventListener("input", loopChanged);
}

const loopStartSlider = document.getElementById("loopstart");
if (loopStartSlider) {
    loopStartSlider.addEventListener("input", loopStartChanged);
}

const loopEndSlider = document.getElementById("loopend");
if (loopEndSlider) {
    loopEndSlider.addEventListener("input", loopEndChanged);
}