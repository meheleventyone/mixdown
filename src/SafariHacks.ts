function clamp(value : number, min : number, max : number) {
    return Math.min(Math.max(min, value), max);
}

interface SafariNode {
    kind : "safari";
    panner : PannerNode;
}

interface StereoNode {
    kind : "stereopanner";
    stereoPanner : StereoPannerNode;
}

// note: on safari this is probably not going to mix well with anything that moves
// the listener position around, at that point we would need to adjust all
// MixdownStereoPanner nodes to be offset from that position 
export class MixdownStereoPanner {
    _panner : SafariNode | StereoNode;
    _pan : number = 0;

    get pan() : number {
        return this._pan;
    }

    set pan(value) {
        this._pan = clamp(value, -1, 1);

        if (this._panner.kind === "stereopanner") {
            this._panner.stereoPanner.pan.value = this._pan;
            return;
        }

        // we want to set the pan position to the correct offset whilst remaining equidistant from the listener
        // hence moving the z position to keep the sound a length of 1 from the listener, otherwise it would get louder
        // in the middle than at the sides
        this._panner.panner.setPosition(this._pan, 0, 1 - Math.abs(this._pan));
    }

    constructor (context : AudioContext) {
        if (!context.createStereoPanner) {
            this._panner = { kind: "safari", panner: context.createPanner() };
            this._panner.panner.panningModel = 'equalpower';
        } else {
            this._panner = { kind: "stereopanner", stereoPanner: context.createStereoPanner()};
        }

    }

    getAudioNode () : AudioNode {
        if (this._panner.kind === "stereopanner") {
            return this._panner.stereoPanner;
        } else {
            return this._panner.panner;
        }
    }
}