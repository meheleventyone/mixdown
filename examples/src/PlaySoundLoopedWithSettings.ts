import {Mixdown, Priority, VoiceGenerationHandle} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav");

let gain = 1;
let balance = 0;
let soundId : VoiceGenerationHandle | undefined = undefined;

function unlock() {
    mixdown.resume();
    soundId = mixdown.playSound({kind: "sound", asset:"twang", gain: gain, loop: {start: 0, end: 0}, priority:Priority.High});
}

function gainChanged(event : Event) {
    gain = parseFloat((event.currentTarget as HTMLInputElement).value);
    if (soundId) {
        mixdown.gain(soundId, gain);
    }
}

function balanceChanged(event : Event) {
    balance = parseFloat((event.currentTarget as HTMLInputElement).value);
    if (soundId) {
        mixdown.balance(soundId, balance);
    }
}

const button = document.getElementById("playsound");
button.addEventListener("click", unlock);

const gainSlider = document.getElementById("gain");
gainSlider.addEventListener("input", gainChanged);

const balanceSlider = document.getElementById("balance");
balanceSlider.addEventListener("input", balanceChanged);