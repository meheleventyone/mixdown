import {Mixdown, Priority, VoiceGenerationHandle, Sound} from "../dist/mixdown.module.js"

function getEventFloatValue(event : Event) : number {
    return parseFloat((event.currentTarget as HTMLInputElement).value);
}

function gainChanged(event : Event) {
    gain = getEventFloatValue(event);
    if (soundId) {
        mixdown.gain(soundId, gain);
    }
}

function fadeGainChanged(event : Event) {
    fadeGain = getEventFloatValue(event);
}

function fadeDurationChanged(event : Event) {
    fadeDuration = getEventFloatValue(event);
}

function balanceChanged(event : Event) {
    balance = getEventFloatValue(event);
    if (soundId) {
        mixdown.balance(soundId, balance);
    }
}

function clipStartChanged(event: Event) {
    if (!buffer) {
        return;
    }

    clipStart = getEventFloatValue(event) * buffer.duration;

    if (soundId && loop) {
        mixdown.loop(soundId, clipStart, clipEnd);
    }
}

function clipEndChanged(event: Event) {
    if (!buffer) {
        return;
    }

    clipEnd = getEventFloatValue(event) * buffer.duration;   
    if (soundId && loop) {
        mixdown.loop(soundId, clipStart, clipEnd);
    } 
}

function loopChanged(event: Event) {
    loop = (event.currentTarget as HTMLInputElement).checked;

    if (!soundId) {
        return;
    }

    if (loop) {
        mixdown.loop(soundId, clipStart, clipEnd);
    } else {
        mixdown.stop(soundId);
    }
}

function loopPlayInChanged(event: Event) {
    playIn = (event.currentTarget as HTMLInputElement).checked;
}

function loopPlayOutChanged(event: Event) {
    playOut = (event.currentTarget as HTMLInputElement).checked;
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

const clipStartSlider = document.getElementById("clipstart") as HTMLInputElement;
if (clipStartSlider) {
    clipStartSlider.addEventListener("input", clipStartChanged);
}

const clipEndSlider = document.getElementById("clipend") as HTMLInputElement;
if (clipEndSlider) {
    clipEndSlider.addEventListener("input", clipEndChanged);
}

const loopCheckbox = document.getElementById("loop") as HTMLInputElement;
if (loopCheckbox) {
    loopCheckbox.addEventListener("input", loopChanged);
}

const loopPlayInCheckbox = document.getElementById("playin") as HTMLInputElement;
if (loopPlayInCheckbox) {
    loopPlayInCheckbox.addEventListener("input", loopPlayInChanged);
}

const loopPlayOutCheckbox = document.getElementById("playout") as HTMLInputElement;
if (loopPlayOutCheckbox) {
    loopPlayOutCheckbox.addEventListener("input", loopPlayOutChanged);
}

const fadeButton = document.getElementById("fade");
if (fadeButton) {
    fadeButton.addEventListener("click", fade);
}

const fadeGainSlider = document.getElementById("fade_gain");
if (fadeGainSlider) {
    fadeGainSlider.addEventListener("input", fadeGainChanged);
}

const fadeDurationSlider = document.getElementById("fade_duration") as HTMLInputElement;
if (fadeDurationSlider) {
    fadeDurationSlider.addEventListener("input", fadeDurationChanged);
}

let mixdown = new Mixdown();
let initialized = false;
let buffer : AudioBuffer | undefined = undefined;

mixdown.loadAsset("twang", "../assets/twang.wav").then(result => {
    initialized = result;
    buffer = mixdown.getBuffer("twang");
    if (!buffer) {
        return;
    }

    clipStart = parseFloat(clipStartSlider.value) * buffer.duration;
    clipEnd = parseFloat(clipEndSlider.value) * buffer.duration;
});

let soundId : VoiceGenerationHandle | undefined =  undefined;

let gain = 1;
let balance = 0;

let clipStart = 0;
let clipEnd = 0;

let loop = false;
let playIn = false;
let playOut = false;

let fadeGain = 0;
let fadeDuration = fadeDurationSlider ? parseFloat(fadeDurationSlider.value) : 0;

function play() {
    if (!initialized || (soundId && mixdown.isPlaying(soundId))) {
        return;
    }

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
            playIn: playIn,
            playOut: playOut
        };
    }

    sound.clip = {
        start: clipStart,
        end: clipEnd
    }

    soundId = mixdown.playSound(sound);
}

function stop() {
    if (!soundId) {
        return;
    }

    mixdown.stop(soundId);
    soundId = undefined;
}

function fade() {
    if (!initialized) {
        return;
    }

    if (!soundId || !mixdown.isPlaying(soundId)) {
        play();
    }

    if (!soundId) {
        return;
    }

    mixdown.fadeTo(soundId, fadeGain, fadeDuration);
}