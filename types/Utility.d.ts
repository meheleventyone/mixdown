interface Value<T> {
    kind: "value";
    value: T;
}
interface Error<T> {
    kind: "error";
    error: T;
}
export declare type Result<T, E> = Value<T> | Error<E>;
export declare type Optional<T> = T | undefined;
export {};
