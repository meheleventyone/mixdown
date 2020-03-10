import { Mixdown, BankBuilder, Priority } from "../dist/mixdown.module.js";
var builder = new BankBuilder();
builder.createMixerDefinition("sfx", 1);
builder.createMixerDefinition("music", 1);
builder.createMixerDefinition("ambience", 1, "sfx");
builder.createAssetDefinition("8bitexplosion", "./assets/8bitexplosion.mp3");
builder.createAssetDefinition("click", "./assets/click.mp3");
builder.createAssetDefinition("error", "./assets/error.mp3");
builder.createAssetDefinition("footsteps", "./assets/footsteps.mp3");
builder.createAssetDefinition("grunt", "./assets/grunt.mp3");
builder.createAssetDefinition("machinegun", "./assets/machine-gun.mp3");
builder.createAssetDefinition("moo", "./assets/moo.mp3");
builder.createAssetDefinition("oildrum", "./assets/oildrum.mp3");
builder.createAssetDefinition("swing", "./assets/swing.mp3");
builder.createStreamDefinition("fight", "./assets/fightmusic.mp3", 1, "music");
builder.createStreamDefinition("sad", "./assets/sadmusic.mp3", 1, "music");
builder.createStreamDefinition("room", "./assets/roomambience.mp3", 1, "ambience");
builder.createStreamDefinition("spaceship", "./assets/spaceshipambience.mp3", 1, "ambience");
builder.createSoundDefinition("8bitexplosion", Priority.High, "8bitexplosion", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("footsteps", Priority.High, "footsteps", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("machinegun", Priority.High, "machinegun", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("swing", Priority.High, "swing", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("moo", Priority.Medium, "moo", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("oildrum", Priority.Medium, "oildrum", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("grunt", Priority.Medium, "grunt", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("click", Priority.Low, "click", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("error", Priority.Low, "error", 1, undefined, undefined, "sfx");
// create mixdown
// max of 15 sounds at once with a max of 4 streams and a slop size for 4 to ease out lower priority sfx
var mixdown = new Mixdown(15, 4, 4);
var loadResult = mixdown.loadBank(builder.bank);
var initialized = false;
if (loadResult.kind === "value") {
    var promise = loadResult.value;
    promise.then(function () { return initialized = true; });
}
function sfx(name) {
    if (!initialized) {
        return;
    }
    mixdown.playSound(name);
}
var currentMusic = undefined;
function music(name) {
    if (!initialized) {
        return;
    }
    if (currentMusic) {
        mixdown.fadeOutAndRemove(currentMusic, 0.5);
    }
    currentMusic = mixdown.playStream(name);
}
var currentAmbience = undefined;
function ambience(name) {
    if (!initialized) {
        return;
    }
    if (currentAmbience) {
        mixdown.fadeOutAndRemove(currentAmbience, 0.5);
    }
    currentAmbience = mixdown.playStream(name);
}
function stopStream(handle) {
    if (handle) {
        mixdown.fadeOutAndRemove(handle, 0.5);
    }
}
// hook ups for html
var sfxNames = [
    "8bitexplosion",
    "footsteps",
    "machinegun",
    "swing",
    "moo",
    "oildrum",
    "grunt",
    "click",
    "error"
];
var musicNames = [
    "fight",
    "sad"
];
var ambienceNames = [
    "room",
    "spaceship"
];
function hookupClicks(nameArray, f) {
    var _loop_1 = function (name_1) {
        var button = document.getElementById(name_1);
        if (button) {
            button.addEventListener("click", function () { return f(name_1); });
        }
    };
    for (var _i = 0, nameArray_1 = nameArray; _i < nameArray_1.length; _i++) {
        var name_1 = nameArray_1[_i];
        _loop_1(name_1);
    }
}
hookupClicks(sfxNames, sfx);
hookupClicks(musicNames, music);
hookupClicks(ambienceNames, ambience);
var stopMusic = document.getElementById("stopmusic");
if (stopMusic) {
    stopMusic.addEventListener("click", function () { return stopStream(currentMusic); });
}
var stopAmbience = document.getElementById("stopambience");
if (stopAmbience) {
    stopAmbience.addEventListener("click", function () { return stopStream(currentAmbience); });
}
function getEventFloatValue(event) {
    return parseFloat(event.currentTarget.value);
}
function masterChanged(event) {
    var gain = getEventFloatValue(event);
    mixdown.masterMixer.gain(gain);
}
function sfxChanged(event) {
    var _a;
    var gain = getEventFloatValue(event);
    var mixer = mixdown.getMixer("sfx");
    (_a = mixer) === null || _a === void 0 ? void 0 : _a.gain(gain);
}
function musicChanged(event) {
    var _a;
    var gain = getEventFloatValue(event);
    var mixer = mixdown.getMixer("music");
    (_a = mixer) === null || _a === void 0 ? void 0 : _a.gain(gain);
}
function ambienceChanged(event) {
    var _a;
    var gain = getEventFloatValue(event);
    var mixer = mixdown.getMixer("ambience");
    (_a = mixer) === null || _a === void 0 ? void 0 : _a.gain(gain);
}
var masterSlider = document.getElementById("master");
if (masterSlider) {
    masterSlider.addEventListener("input", masterChanged);
}
var sfxSlider = document.getElementById("sfx");
if (sfxSlider) {
    sfxSlider.addEventListener("input", sfxChanged);
}
var musicSlider = document.getElementById("music");
if (musicSlider) {
    musicSlider.addEventListener("input", musicChanged);
}
var ambienceSlider = document.getElementById("master");
if (ambienceSlider) {
    ambienceSlider.addEventListener("input", ambienceChanged);
}
