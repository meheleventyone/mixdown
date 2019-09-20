"use strict";
// A Web Audio based mixer for games.
var Mixdown = /** @class */ (function () {
    function Mixdown() {
        this.context = new AudioContext();
        this.assetMap = {};
    }
    Mixdown.prototype.suspend = function () {
        if (this.context.state === "suspended") {
            return;
        }
        // todo: remove all current nodes
        this.context.suspend().then(this.rebuild);
    };
    Mixdown.prototype.resume = function () {
        if (this.context.state === "running") {
            return;
        }
        this.context.resume();
    };
    Mixdown.prototype.rebuild = function () {
    };
    Mixdown.prototype.play = function (playable) {
        return undefined;
    };
    Mixdown.prototype.stop = function (index) {
        return "doesNotExist";
    };
    Mixdown.prototype.fadeIn = function (index, value, duration) {
        return "doesNotExist";
    };
    Mixdown.prototype.fadeOut = function (index, value, duration) {
        return "doesNotExist";
    };
    Mixdown.prototype.gain = function (index, value) {
        return "doesNotExist";
    };
    Mixdown.prototype.balance = function (index, value) {
        return "doesNotExist";
    };
    Mixdown.prototype.loadAsset = function (name, path) {
        // todo: make sure we're loading something we support
        // todo: return promise from this to cover user callbacks?
        // todo: xmlhttprequest for backwards compat?
        var _this = this;
        fetch(path).then(function (response) { return response.arrayBuffer(); })
            .then(function (data) { return _this.context.decodeAudioData(data); })
            .then(function (buffer) { return _this.assetMap[name] = buffer; })
            .catch(function (error) { return console.error(error); });
    };
    return Mixdown;
}());
