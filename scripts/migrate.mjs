import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(raiz, "db", "schema.sql"), "utf8");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const cliente = new pg.Client({ connectionString });
await cliente.connect();
try {
  await cliente.query(sql);
  const { rows } = await cliente.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by 1",
  );
  console.log("Tablas:", rows.map((r) => r.table_name).join(", "));
} finally {
  await cliente.end();
}
