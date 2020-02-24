/**
 * A [[GenerationalArena]] is a fixed size pool of values of type T. Access is controlled via
 * [[GenerationHandle|Generation Handles]]. These are valid so long as the element they point to
 *  has not been replaced since it was issued.
 * 
 * This is useful to prevent accidental access and modification of elements that have changed by a stale index. 
 * This allows handles to be kept with a guarentee that if the element has changed it cannot be accessed by an older
 * handle pointing to the same element. In effect weakly referencing values stored in the arena.
 * 
 * A GenerationHandle holds two readonly numbers. The first is the index into the [[GernerationalArena]]. 
 * The second is the generation of element pointed to when the handle was generated.
 * 
 * The main points of note is that these values should not be modified after they have been handed out. Nor should
 * users create these themselves. Nor should they pass handles from one arena into a different arena. Further data references
 * taken from the Arena should be treated as ephemeral and not stored elsewhere.
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
 * For convenience there exists [[SimpleGenerationalArena]] that provides this behavior for [[GenerationHandle]].
 * 
 * @packageDocumentation
 */

/**
 * GenerationalHandle stores readonly values representing an index into the [[GenerationalArena]] and the generation
 * that it is valid for.
 */
export class GenerationHandle {
    readonly index : number;
    readonly generation : number;

    constructor(index : number, generation : number) {
        this.index = index;
        this.generation = generation;
    }
}

/**
 * GenerationalArena stores a number of items of type T that can be accessed through a handle of type H.
 * 
 * Access via handles is policed such that handles to removed values are considered invalid.
 * 
 * Data accessed via a handle should not be retained and should be treated as ephemeral.
 */
export class GenerationalArena<T, H extends GenerationHandle> {
    generation : number[] = [];
    data : (T | undefined)[] = [];
    freeList : number[] = [];

    handleConstructor : new(index : number, generation : number) => H;

    /**
     * Constructs a GenerationalArena.
     * @param size The number of items contained in the arena.
     * @param handleConstructor The constructor function for the handle (e.g. if H if GenerationalArena then pass in GenerationalArena).
     */
    constructor(size : number, handleConstructor : new(index : number, generation : number) => H) {
        this.handleConstructor = handleConstructor;

        for (let i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = undefined;
            this.freeList.push(i);
        }
    }

    /**
     * Adds an item of type T to the arena.
     * @param data The data to add.
     * @returns A handle of type H if the operation was successful or undefined if it failed.
     */
    add(data : T) : H | undefined {
        if (this.freeList.length === 0) {
            return undefined;
        }

        let index = this.freeList.pop() as number;
        this.data[index] = data;
        return new this.handleConstructor(index, this.generation[index]);
    }

    /**
     * Returns the data represented by the handle passed in. This should not be retained and treated
     * as ephemeral.
     * @param handle The handle to retrieve data for.
     * @returns Either the data or undefined if the handle is now invalid.
     */
    get(handle : H) : T | undefined {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }

        let index = handle.index;
        return this.data[index];
    }

    /**
     * Returns the first piece of data that meets the criteria specified by test.
     * @param test The function to test against.
     * @returns The data found or undefined. TODO: This should return a handle.
     */
    findFirst(test : (data : T) => boolean) : T | undefined {
        for (let i = 0; i < this.data.length; ++i) {
            let data = this.data[i];
            if (data === undefined) {
                continue;
            }
            
            if (!test(data)) {
                continue;
            }

            return data;
        }
    }

    /**
     * Removes the data pointed to by handle.
     * @param handle The handle to remove.
     */
    remove(handle : H) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        let index = handle.index;
        this.generation[index] += 1;
        this.data[index] = undefined;
        this.freeList.push(index);
    }

    /**
     * Tests a handle to see if it is still valid.
     * @param handle The handle to test.
     * @returns True if valid, false otherwise.
     */
    valid(handle : H) : boolean {
        return handle.generation === this.generation[handle.index];
    }

    /**
     * @returns The number of free slots remaining.
     */
    numFreeSlots() : number {
        return this.freeList.length;
    }

    /**
     * @returns The number of slots used.
     */
    numUsedSlots() : number {
        return this.data.length - this.freeList.length;
    }
}

/**
 * SimpleGenerationalArena is a version of [[GenerationalArena]] that obviates the need to
 * specify the handle type as a convenience.
 * @typeparam T The type of the data to be stored in the Arena.
 */
class SimpleGenerationalArena<T> extends GenerationalArena<T, GenerationHandle> {
    constructor(size : number) {
        super(size, GenerationHandle);
    }
}