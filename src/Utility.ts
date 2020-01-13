interface Value<T> {
    kind: "value";
    value: T;
}
interface Error<T> {
    kind: "error";
    error: T;
}
export type Result<T, E> = Value<T> | Error<E>;
export type Optional<T> = T | undefined;
