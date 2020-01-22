/**
 * A set of utility functions and classes to help work around deficiencies in the Safari WebAudio implementation.
 * @packageDocumentation
 */
/**
 * Part of the [[MixdownStereoPannerNode]] discriminated union.
 *
 * This is for the Safari implementation using the WebAudio PannerNode.
 */
interface SafariNode {
    kind: "safari";
    panner: PannerNode;
}
/**
 * Part of the [[MixdownStereoPannerNode]] discriminated union.
 *
 * This is for all non-Safari implementations using the WebAudio StereoPannerNode.
 */
interface StereoNode {
    kind: "stereopanner";
    stereoPanner: StereoPannerNode;
}
/**
 * A discriminated union representing the different implementations of the [[MixdownStereoPanner]]
 */
declare type MixdownStereoPannerNode = SafariNode | StereoNode;
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
export declare class MixdownStereoPanner {
    /**
     * @ignore
     * */
    _panner: MixdownStereoPannerNode;
    /**
      * @ignore
      * */
    _pan: number;
    /**
     *  @returns The current value of the pan property.
     */
    get pan(): number;
    /**
     * @param value The value to set pan to in the underlying implementation. This is clamped in the range -1 to 1 inclusive.
     */
    set pan(value: number);
    /**
     *
     * @param context The AudioContext that [[Mixdown]] is using.
     */
    constructor(context: AudioContext);
    /**
     * @returns A reference to the AudioNode being used by the underlying implementation.
     */
    getAudioNode(): AudioNode;
}
export {};
