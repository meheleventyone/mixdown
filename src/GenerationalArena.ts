/**
 * A [[GenerationalArena]] is a fixed size pool of values of type T. Access is controlled via
 * [[GenerationHandle|Generation Handles]]. These are valid so long as the element they point to
 *  has not been replaced since it was issued. T
 * 
 * This is useful to prevent accidental access and modification of elements that have changed by a stale index. 
 * This allows handles to be kept with a guarentee that if the element has changed it cannot be accessed by an older
 * handle pointing to the same element. In effect weakly referencing values stored in the arena.
 * @packageDocumentation
 */

export interface GenerationHandle {
    readonly index : number;
    readonly generation : number;
}

export class GenerationalArena<T> {
    generation : number[] = [];
    data : (T | undefined)[] = [];
    freeList : number[] = [];

    constructor(size : number) {
        for (let i = 0; i < size; ++i) {
            this.generation[i] = 0;
            this.data[i] = undefined;
            this.freeList.push(i);
        }
    }

    add(data : T) : GenerationHandle | undefined {
        if (this.freeList.length === 0) {
            return undefined;
        }

        let index = this.freeList.pop() as number;
        this.data[index] = data;
        return { index : index, generation : this.generation[index] };
    }

    get(handle : GenerationHandle) : T | undefined {
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

    remove(handle : GenerationHandle) {
        if (handle.generation !== this.generation[handle.index]) {
            return undefined;
        }
        let index = handle.index;
        this.generation[index] += 1;
        this.data[index] = undefined;
        this.freeList.push(index);
    }

    valid(handle : GenerationHandle) : boolean {
        return handle.generation === this.generation[handle.index];
    }

    numFreeSlots() : number {
        return this.freeList.length;
    }

    numUsedSlots() : number {
        return this.data.length - this.freeList.length;
    }
}