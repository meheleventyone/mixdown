/**
 *  Value<T> is a part of the Result<T, E> discriminated union, it represents a valid value of T being returned.
 *  @typeParam T The type of the value that will be contained in Value<T>.
 */ 
interface Value<T> {
    kind: "value";
    value: T;
}

/**
 *  Error<T> is a part of the Result<T, E> discriminated union, it represents an error of T being returned.
 *  @typeParam T The type of the error that will be contained in Error<T>.
 */ 
interface Error<T> {
    kind: "error";
    error: T;
}

/**
 * A Result type representing a discriminated union of a successful value being returned from a function or an error.
 * 
 * Checking for value or error:
 * ```typescript
 * const result = someFunctionThatReturnsResult();
 * if (result.kind === "value") {
 *      // can use result.value
 * } else {
 *      // can use result.error
 * }
 * ```
 * @typeParam T The type of the value to be returned.
 * @typeParam E The type of the error to be returned in the event that the function fails.
 */
export type Result<T, E> = Value<T> | Error<E>;

/**
 * An Optional type representing a value that may or may not be set.
 * 
 * Simple to check for a valid value:
 * ```typescript
 * if (optionalValue !== undefined) {
 *      // do something
 * }
 * ```
 * 
 * @typeParam T the type of the value if set.
 */
export type Optional<T> = T | undefined;
