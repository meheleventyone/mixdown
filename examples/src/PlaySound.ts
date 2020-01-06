import {Mixdown, Priority} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();
let initialized = false;
mixdown.loadAsset("moo", "../assets/moo.mp3").then(result => initialized = result);;

function unlock() {
    if (!initialized) {
        return;
    }
    mixdown.resume();
    mixdown.playSoundDef({kind: "sound", name:"moo", asset:"moo", gain: 1, priority:Priority.High});
}

const button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}