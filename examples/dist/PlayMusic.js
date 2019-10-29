import { Mixdown } from "../dist/mixdown.module.js";
var mixdown = new Mixdown();
function unlock() {
    mixdown.resume();
    mixdown.playMusic({ kind: "music", source: "../assets/paradise.mp3", gain: 1 });
}
var button = document.getElementById("playmusic");
if (button) {
    button.addEventListener("click", unlock);
}
