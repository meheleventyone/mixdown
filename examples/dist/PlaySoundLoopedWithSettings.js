import { Mixdown, Priority } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav");
var gain = 1;
var balance = 0;
var soundId = undefined;
function unlock() {
    mixdown.resume();
    soundId = mixdown.playSound({ kind: "sound", asset: "twang", gain: gain, loop: { start: 0, end: 0 }, priority: Priority.High });
}
function gainChanged(event) {
    gain = parseFloat(event.currentTarget.value);
    if (soundId) {
        mixdown.gain(soundId, gain);
    }
}
function balanceChanged(event) {
    balance = parseFloat(event.currentTarget.value);
    if (soundId) {
        mixdown.balance(soundId, balance);
    }
}
var button = document.getElementById("playsound");
button.addEventListener("click", unlock);
var gainSlider = document.getElementById("gain");
gainSlider.addEventListener("input", gainChanged);
var balanceSlider = document.getElementById("balance");
balanceSlider.addEventListener("input", balanceChanged);
