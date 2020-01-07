import { Mixdown, BankBuilder, Priority } from "../dist/mixdown.module.js";
var builder = new BankBuilder();
builder.createMixerDefinition("sfx", 1);
builder.createMixerDefinition("music", 1);
builder.createMixerDefinition("ambience", 1, "sfx");
builder.createAssetDefinition("8bitexplosion", "../assets/8bitexplosion.mp3");
builder.createAssetDefinition("click", "../assets/click.mp3");
builder.createAssetDefinition("error", "../assets/error.mp3");
builder.createAssetDefinition("footsteps", "../assets/footsteps.mp3");
builder.createAssetDefinition("grunt", "../assets/grunt.mp3");
builder.createAssetDefinition("machine-gun", "../assets/machine-gun.mp3");
builder.createAssetDefinition("moo", "../assets/moo.mp3");
builder.createAssetDefinition("oildrum", "../assets/oildrum.mp3");
builder.createAssetDefinition("swing", "../assets/swing.mp3");
builder.createMusicDefinition("fightmusic", "../assets/fightmusic.mp3", 1, "music");
builder.createMusicDefinition("sadmusic", "../assets/sadmusic.mp3", 1, "music");
builder.createMusicDefinition("roomambience", "../assets/roomambience.mp3", 1, "ambience");
builder.createMusicDefinition("spaceshipambience", "../assets/spaceshipambience.mp3", 1, "ambience");
builder.createSoundDefinition("8bitexplosion", Priority.High, "8bitexplosion", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("footsteps", Priority.High, "footsteps", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("machine-gun", Priority.High, "machine-gun", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("swing", Priority.High, "swing", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("moo", Priority.Medium, "moo", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("oildrum", Priority.Medium, "oildrum", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("grunt", Priority.Medium, "grunt", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("click", Priority.Low, "click", 1, undefined, undefined, "sfx");
builder.createSoundDefinition("error", Priority.Low, "error", 1, undefined, undefined, "sfx");
// create mixdown
// max of 15 sounds at once with a max of 4 streams and a slop size for 4 to ease out lower priority sfx
var mixdown = new Mixdown(15, 4, 4);
var loadResult = mixdown.loadBank(builder);
var initialized = false;
if (loadResult.kind === "value") {
    var promise = loadResult.value;
    promise.then(function () { return initialized = true; });
}
