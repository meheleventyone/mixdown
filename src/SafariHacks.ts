/**
 * A set of utility functions and classes to help work around deficiencies in the Safari WebAudio implementation.
 * @packageDocumentation
 */

/**
 * Clamps a value to be within a lower and upper bound defined by min and max.
 * @param value The input value to clamp.
 * @param min The lower bound inclusive to clamp value to.
 * @param max The upper bound inclusive to clamp value to.
 * @returns The value clamped in the range min to max inclusive.
 */
function clamp(value : number, min : number, max : number) {
    return Math.min(Math.max(min, value), max);
}

/**
 * Part of the [[MixdownStereoPannerNode]] discriminated union.
 * 
 * This is for the Safari implementation using the WebAudio PannerNode.
 */
interface SafariNode {
    kind : "safari";
    panner : PannerNode;
}

/**
 * Part of the [[MixdownStereoPannerNode]] discriminated union.
 * 
 * This is for all non-Safari implementations using the WebAudio StereoPannerNode.
 */
interface StereoNode {
    kind : "stereopanner";
    stereoPanner : StereoPannerNode;
}

/**
 * A discriminated union representing the different implementations of the [[MixdownStereoPanner]]
 */
type MixdownStereoPannerNode = SafariNode | StereoNode;

/**
 * MixdownStereoPanner is a wrapper over the cross-platform implementation details of StereoPannerNode.
 * 
 * On Safari it represents the StereoPannerNode using the PannerNode using the 'equalpower' model. 
 * To correctly pan the sound it is moved along the x-axis between -1 and 1 from left to right. 
 * To keep the loudness equivalent for all positions as you would expect in purely stereo output the
 *  distance is kept at 1 unit by offsetting the sound forward along the z-axis by 1 - abs(panValue).
 * 
 * On other platforms it uses the standard StereoPannerNode.
 * 
 * Note: On Safari this is probably not going to mix well with anything that moves
 * the listener position around, at that point we would need to adjust all
 * MixdownStereoPanner nodes to be offset from that position 
 */
export class MixdownStereoPanner {
    /** 
     * @ignore 
     * */
    _panner : MixdownStereoPannerNode;

    /** 
      * @ignore 
      * */
    _pan : number = 0;

    /**
     *  @returns The current value of the pan property.
     */
    get pan() : number {
        return this._pan;
    }

    /**
     * @param value The value to set pan to in the underlying implementation. This is clamped in the range -1 to 1 inclusive.
     */
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

    /**
     * 
     * @param context The AudioContext that [[Mixdown]] is using.
     */
    constructor (context : AudioContext) {
        if (!context.createStereoPanner) {
            this._panner = { kind: "safari", panner: context.createPanner() };
            this._panner.panner.panningModel = 'equalpower';
        } else {
            this._panner = { kind: "stereopanner", stereoPanner: context.createStereoPanner()};
        }

    }

    /**
     * @returns A reference to the AudioNode being used by the underlying implementation.
     */
    getAudioNode () : AudioNode {
        if (this._panner.kind === "stereopanner") {
            return this._panner.stereoPanner;
        } else {
            return this._panner.panner;
        }
    }
}