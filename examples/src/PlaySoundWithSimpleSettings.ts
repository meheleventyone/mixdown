import {Mixdown, Priority} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav").then(result => initialized = result);

let gain = 1;
let initialized = false;

function unlock() {
    if (!initialized) {
        return;
    }
    mixdown.resume();
    mixdown.playSoundDef({kind: "sound", name: "twang", asset:"twang", gain: gain, priority:Priority.High});
}

function gainChanged(event : Event) {
    gain = parseFloat((event.currentTarget as HTMLInputElement).value);
}

const button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}

const gainSlider = document.getElementById("gain");
if (gainSlider) {
    gainSlider.addEventListener("input", gainChanged);
}