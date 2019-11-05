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
    mixdown.playSound({ kind: "sound", asset: "twang", gain: 1, priority: Priority.High });
}
var button = document.getElementById("playsound");
if (button) {
    button.addEventListener("click", unlock);
}
