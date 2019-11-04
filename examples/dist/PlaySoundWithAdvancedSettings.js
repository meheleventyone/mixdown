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
function balanceChanged(event) {
    balance = getEventFloatValue(event);
    if (soundId) {
        mixdown.balance(soundId, balance);
    }
}
function clipChanged(event) {
    clip = event.currentTarget.checked;
}
function clipStartChanged(event) {
    clipStart = getEventFloatValue(event);
}
function clipEndChanged(event) {
    clipEnd = getEventFloatValue(event);
}
function loopChanged(event) {
    loop = event.currentTarget.checked;
    if (!soundId) {
        return;
    }
    if (loop) {
        mixdown.loop(soundId, loopStart, loopEnd);
    }
    else {
        // todo check playing
        mixdown.stopLoop(soundId);
    }
}
function loopStartChanged(event) {
    if (!buffer) {
        return;
    }
    loopStart = getEventFloatValue(event) * buffer.duration;
    if (!loop || !soundId) {
        return;
    }
    console.log("start " + loopStart);
    // todo check playing
    mixdown.loop(soundId, loopStart, loopEnd);
}
function loopEndChanged(event) {
    if (!buffer) {
        return;
    }
    loopEnd = getEventFloatValue(event) * buffer.duration;
    if (!loop || !soundId) {
        return;
    }
    console.log("end " + loopEnd);
    // todo check playing
    mixdown.loop(soundId, loopStart, loopEnd);
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
var clipCheckbox = document.getElementById("clip");
if (clipCheckbox) {
    clipCheckbox.addEventListener("input", clipChanged);
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
var loopStartSlider = document.getElementById("loopstart");
if (loopStartSlider) {
    loopStartSlider.addEventListener("input", loopStartChanged);
}
var loopEndSlider = document.getElementById("loopend");
if (loopEndSlider) {
    loopEndSlider.addEventListener("input", loopEndChanged);
}
var mixdown = new Mixdown();
var initialized = false;
var buffer = undefined;
mixdown.loadAsset("twang", "../assets/twang.wav").then(function (result) {
    initialized = result;
    buffer = mixdown.getBuffer("twang");
    if (!buffer) {
        return;
    }
    loop = loopCheckbox.checked;
    loopStart = parseFloat(loopStartSlider.value) * buffer.duration;
    loopEnd = parseFloat(loopEndSlider.value) * buffer.duration;
});
var soundId = undefined;
var gain = 1;
var balance = 0;
var clip = false;
var clipStart = 0;
var clipEnd = 0;
var loop = false;
var loopStart = 0;
var loopEnd = 0;
function play() {
    if (!initialized || soundId) {
        return;
    }
    // todo check if need to resume
    mixdown.resume();
    var sound = {
        kind: "sound",
        asset: "twang",
        gain: gain,
        priority: Priority.High
    };
    if (loop) {
        console.log("start " + loopStart + " end " + loopEnd);
        sound.loop = {
            start: loopStart,
            end: loopEnd
        };
    }
    if (clip) {
        sound.clip = {
            start: clipStart,
            end: clipEnd
        };
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
