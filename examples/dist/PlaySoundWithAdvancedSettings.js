import { Mixdown, Priority } from "../dist/mixdown.module.js";
function getEventFloatValue(event) {
    return parseFloat(event.currentTarget.value);
}
function gainChanged(event) {
    gain = getEventFloatValue(event);
    if (soundId) {
        mixdown.gain(soundId, gain);
    }
}
function fadeGainChanged(event) {
    fadeGain = getEventFloatValue(event);
}
function fadeDurationChanged(event) {
    fadeDuration = getEventFloatValue(event);
}
function balanceChanged(event) {
    balance = getEventFloatValue(event);
    if (soundId) {
        mixdown.balance(soundId, balance);
    }
}
function clipStartChanged(event) {
    if (!buffer) {
        return;
    }
    clipStart = getEventFloatValue(event) * buffer.duration;
    if (soundId && loop) {
        mixdown.loop(soundId, clipStart, clipEnd);
    }
}
function clipEndChanged(event) {
    if (!buffer) {
        return;
    }
    clipEnd = getEventFloatValue(event) * buffer.duration;
    if (soundId && loop) {
        mixdown.loop(soundId, clipStart, clipEnd);
    }
}
function loopChanged(event) {
    loop = event.currentTarget.checked;
    if (!soundId) {
        return;
    }
    if (loop) {
        mixdown.loop(soundId, clipStart, clipEnd);
    }
    else {
        mixdown.stop(soundId);
    }
}
function loopPlayInChanged(event) {
    playIn = event.currentTarget.checked;
}
function loopPlayOutChanged(event) {
    playOut = event.currentTarget.checked;
}
var playButton = document.getElementById("playsound");
if (playButton) {
    playButton.addEventListener("click", play);
}
var stopButton = document.getElementById("stopsound");
if (stopButton) {
    stopButton.addEventListener("click", stop);
}
var gainSlider = document.getElementById("gain");
if (gainSlider) {
    gainSlider.addEventListener("input", gainChanged);
}
var balanceSlider = document.getElementById("balance");
if (balanceSlider) {
    balanceSlider.addEventListener("input", balanceChanged);
}
var clipStartSlider = document.getElementById("clipstart");
if (clipStartSlider) {
    clipStartSlider.addEventListener("input", clipStartChanged);
}
var clipEndSlider = document.getElementById("clipend");
if (clipEndSlider) {
    clipEndSlider.addEventListener("input", clipEndChanged);
}
var loopCheckbox = document.getElementById("loop");
if (loopCheckbox) {
    loopCheckbox.addEventListener("input", loopChanged);
}
var loopPlayInCheckbox = document.getElementById("playin");
if (loopPlayInCheckbox) {
    loopPlayInCheckbox.addEventListener("input", loopPlayInChanged);
}
var loopPlayOutCheckbox = document.getElementById("playout");
if (loopPlayOutCheckbox) {
    loopPlayOutCheckbox.addEventListener("input", loopPlayOutChanged);
}
var fadeButton = document.getElementById("fade");
if (fadeButton) {
    fadeButton.addEventListener("click", fade);
}
var fadeGainSlider = document.getElementById("fade_gain");
if (fadeGainSlider) {
    fadeGainSlider.addEventListener("input", fadeGainChanged);
}
var fadeDurationSlider = document.getElementById("fade_duration");
if (fadeDurationSlider) {
    fadeDurationSlider.addEventListener("input", fadeDurationChanged);
}
var mixdown = new Mixdown();
var initialized = false;
var buffer = undefined;
mixdown.loadAsset("moo", "../assets/moo.mp3").then(function (result) {
    initialized = result;
    buffer = mixdown.getBuffer("moo");
    if (!buffer) {
        return;
    }
    clipStart = parseFloat(clipStartSlider.value) * buffer.duration;
    clipEnd = parseFloat(clipEndSlider.value) * buffer.duration;
});
var soundId = undefined;
var gain = 1;
var balance = 0;
var clipStart = 0;
var clipEnd = 0;
var loop = false;
var playIn = false;
var playOut = false;
var fadeGain = 0;
var fadeDuration = fadeDurationSlider ? parseFloat(fadeDurationSlider.value) : 0;
function play() {
    if (!initialized || (soundId && mixdown.isPlaying(soundId))) {
        return;
    }
    // todo check if need to resume
    mixdown.resume();
    var sound = {
        kind: "sound",
        name: "moo",
        asset: "moo",
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
    };
    soundId = mixdown.playSoundDef(sound);
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
