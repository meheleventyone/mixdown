import {Mixdown} from "../dist/mixdown.module.js"

let mixdown = new Mixdown();

function unlock() {
    mixdown.resume();
    mixdown.playMusic({kind: "music", source:"../assets/paradise.mp3", gain: 1});
}

const button = document.getElementById("playmusic");
button.addEventListener("click", unlock);