import { Mixdown, Priority } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav").then(function (result) { return initialized = result; });
var gain = 1;
var initialized = false;
function unlock() {
    if (!initialized) {
        return;
    }
    mixdown.resume();
    mixdown.playSound({ kind: "sound", asset: "twang", gain: gain, priority: Priority.High });
}
function gainChanged(event) {
    gain = parseFloat(event.currentTarget.value);
}
var button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}
var gainSlider = document.getElementById("gain");
if (gainSlider) {
    gainSlider.addEventListener("input", gainChanged);
}
