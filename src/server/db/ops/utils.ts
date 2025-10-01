import { readFile } from "node:fs/promises";
import path from "node:path";
import { type SQLWrapper, sql } from "drizzle-orm";

export type DatabaseExecutor = {
  execute(query: SQLWrapper): Promise<unknown>;
};

const ROOT_DIR = path.resolve(process.cwd());

export async function readSqlFile(relativePath: string): Promise<string> {
  const absolutePath = path.resolve(ROOT_DIR, relativePath);
  return readFile(absolutePath, "utf8");
}

export async function runSqlFile(
  db: DatabaseExecutor,
  relativePath: string,
): Promise<void> {
  const contents = await readSqlFile(relativePath);
  const trimmed = contents.trim();
  if (!trimmed) {
    return;
  }
  await db.execute(sql.raw(trimmed));
}

export function formatManualMigrationId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}
