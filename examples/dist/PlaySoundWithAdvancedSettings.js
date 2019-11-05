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
var mixdown = new Mixdown();
var initialized = false;
var buffer = undefined;
mixdown.loadAsset("twang", "../assets/twang.wav").then(function (result) {
    initialized = result;
    buffer = mixdown.getBuffer("twang");
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
function play() {
    if (soundId) {
        mixdown.isPlaying(soundId);
    }
    if (!initialized || (soundId && mixdown.isPlaying(soundId))) {
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
        sound.loop = {
            playIn: playIn,
            playOut: playOut
        };
    }
    sound.clip = {
        start: clipStart,
        end: clipEnd
    };
    soundId = mixdown.playSound(sound);
}
function stop() {
    if (!soundId) {
        return;
    }
    mixdown.stop(soundId);
    soundId = undefined;
}
