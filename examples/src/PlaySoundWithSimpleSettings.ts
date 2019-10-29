import {Mixdown, Priority, VoiceGenerationHandle} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav");

let gain = 1;

function unlock() {
    mixdown.resume();
    mixdown.playSound({kind: "sound", asset:"twang", gain: gain, priority:Priority.High});
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