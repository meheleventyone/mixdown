import {Mixdown, Priority} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();
let initialized = false;
mixdown.loadAsset("twang", "../assets/twang.wav").then(result => initialized = result);;

function unlock() {
    if (!initialized) {
        return;
    }
    mixdown.resume();
    mixdown.playSoundDef({kind: "sound", name:"twang", asset:"twang", gain: 1, priority:Priority.High});
}

const button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}