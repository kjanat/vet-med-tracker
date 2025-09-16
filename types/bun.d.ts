export {};

declare global {
  interface ImportMeta {
    readonly dir: string;
  }

  interface BunFile {
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
  }

  type BunWrite = (
    path: string | URL,
    data:
      | string
      | ArrayBufferView
      | ArrayBuffer
      | Blob
      | Response
      | ReadableStream<Uint8Array>,
  ) => Promise<void>;

  const Bun: {
    file(path: string | URL): BunFile;
    write: BunWrite;
  };
}
