import {Mixdown} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();

function unlock() {
    mixdown.resume();
    mixdown.playMusicDef({kind: "music", name:"paradise", source:"../assets/paradise.mp3", gain: 1});
}

const button = document.getElementById("playmusic");
if (button) {
    button.addEventListener("click", unlock);
}