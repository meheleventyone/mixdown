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

export class GenerationHandle {
    readonly index : number;
    readonly generation : number;

    constructor(index : number, generation : number) {
        this.index = index;
        this.generation = generation;
    }
}

export class GenerationalArena<T, E extends GenerationHandle> {
    generation : number[] = [];
    data : (T | undefined)[] = [];
    freeList : number[] = [];

    handleConstructor : new(index : number, generation : number) => E;

    constructor(size : number, handleConstructor : new(index : number, generation : number) => E) {
        this.handleConstructor = handleConstructor;

        for (let i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = undefined;
            this.freeList.push(i);
        }
    }

    add(data : T) : E | undefined {
        if (this.freeList.length === 0) {
            return undefined;
        }

        let index = this.freeList.pop() as number;
        this.data[index] = data;
        return new this.handleConstructor(index, this.generation[index]);
    }

    get(handle : E) : T | undefined {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }

        let index = handle.index;
        return this.data[index];
    }

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

    remove(handle : E) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        let index = handle.index;
        this.generation[index] += 1;
        this.data[index] = undefined;
        this.freeList.push(index);
    }

    valid(handle : E) : boolean {
        return handle.generation === this.generation[handle.index];
    }

    numFreeSlots() : number {
        return this.freeList.length;
    }

    numUsedSlots() : number {
        return this.data.length - this.freeList.length;
    }
}

class SimpleGenerationalArena<T> extends GenerationalArena<T, GenerationHandle> {
    constructor(size : number) {
        super(size, GenerationHandle);
    }
}