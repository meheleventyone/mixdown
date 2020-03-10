import { Mixdown } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
function unlock() {
    mixdown.resume();
    mixdown.playStreamDef({ kind: "stream", name: "fightmusic", source: "../assets/fightmusic.mp3", gain: 1 });
}
var button = document.getElementById("playmusic");
if (button) {
    button.addEventListener("click", unlock);
}
