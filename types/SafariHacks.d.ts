interface SafariNode {
    kind: "safari";
    panner: PannerNode;
}
interface StereoNode {
    kind: "stereopanner";
    stereoPanner: StereoPannerNode;
}
export declare class MixdownStereoPanner {
    _panner: SafariNode | StereoNode;
    _pan: number;
    get pan(): number;
    set pan(value: number);
    constructor(context: AudioContext);
    getAudioNode(): AudioNode;
}
export {};
