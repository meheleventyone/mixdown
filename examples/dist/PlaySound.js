import { Mixdown, Priority } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
var initialized = false;
mixdown.loadAsset("moo", "./assets/moo.mp3").then(function (result) { return initialized = result; });
;
function unlock() {
    if (!initialized) {
        return;
    }
    mixdown.resume();
    mixdown.playSoundDef({ kind: "sound", name: "moo", asset: "moo", gain: 1, priority: Priority.High });
}
var button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}
