import { Mixdown, Priority } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
mixdown.loadAsset("twang", "../assets/twang.wav");
function unlock() {
    mixdown.resume();
    mixdown.playSound({ kind: "sound", asset: "twang", gain: 1, priority: Priority.High });
}
document.addEventListener("click", unlock);
