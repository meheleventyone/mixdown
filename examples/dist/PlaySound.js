import { Mixdown, Priority } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
var initialized = false;
mixdown.loadAsset("twang", "../assets/twang.wav").then(function (result) { return initialized = result; });
;
function unlock() {
    if (!initialized) {
        return;
    }
    mixdown.resume();
    mixdown.playSoundDef({ kind: "sound", name: "twang", asset: "twang", gain: 1, priority: Priority.High });
}
var button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}
