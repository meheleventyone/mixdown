export interface GenerationHandle {
    readonly index: number;
    readonly generation: number;
}
export declare class GenerationalArena<T> {
    generation: number[];
    data: (T | null)[];
    freeList: number[];
    constructor(size: number);
    add(data: T): GenerationHandle | undefined;
    get(handle: GenerationHandle): T | undefined;
    findFirst(test: (data: T) => boolean): T | undefined;
    remove(handle: GenerationHandle): undefined;
    valid(handle: GenerationHandle): boolean;
    numFreeSlots(): number;
    numUsedSlots(): number;
}
