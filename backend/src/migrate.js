import fs from "fs";
import { query } from "./db.js";

const sql = fs.readFileSync(new URL("schema.sql", import.meta.url), "utf-8");

try {
  await query(sql);
  console.log("Schema migrated successfully");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
