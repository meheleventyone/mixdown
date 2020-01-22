/**
 * A [[GenerationalArena]] is a fixed size pool of values of type T. Access is controlled via
 * [[GenerationHandle|Generation Handles]]. These are valid so long as the element they point to
 *  has not been replaced since it was issued. T
 *
 * This is useful to prevent accidental access and modification of elements that have changed by a stale index.
 * This allows handles to be kept with a guarentee that if the element has changed it cannot be accessed by an older
 * handle pointing to the same element. In effect weakly referencing values stored in the arena.
 *
 * A GenerationHandle holds two readonly numbers. The first is the index into the [[GernerationalArena]].
 * The second is the generation of element pointed to when the handle was generated.
 *
 * The main point of note is that these values should not be modified after they have been handed out. Nor should
 * users create these themselves. Nor should they pass handles from one arena into a different arena.
 *
 * For safety it can be a good idea to extend GenerationalHandle:
 * ```typescript
 * export class SpecificHandle extends GenerationHandle {
 *      constructor (index : number, generation : number) {
 *          super(index, generation);
 *      }
 * }
 * ```
 *
 * And then extend GenerationalArena:
 * ```typescript
 * class SpecificGenerationalArena<T> extends GenerationalArena<T, SpecificHandle> {
 *      constructor(size : number) {
 *          super(size, SpecificHandle);
 *      }
 * }
 * ```
 *
 * This results in an arena that can only take the SpecificHandle type as a valid handle.
 *
 * @packageDocumentation
 */
export declare class GenerationHandle {
    readonly index: number;
    readonly generation: number;
    constructor(index: number, generation: number);
}
export declare class GenerationalArena<T, E extends GenerationHandle> {
    generation: number[];
    data: (T | undefined)[];
    freeList: number[];
    handleConstructor: new (index: number, generation: number) => E;
    constructor(size: number, handleConstructor: new (index: number, generation: number) => E);
    add(data: T): E | undefined;
    get(handle: E): T | undefined;
    findFirst(test: (data: T) => boolean): T | undefined;
    remove(handle: E): undefined;
    valid(handle: E): boolean;
    numFreeSlots(): number;
    numUsedSlots(): number;
}
