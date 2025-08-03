require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const sql = neon(
	`postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require&channel_binding=require`,
);

async function getPgVersion() {
	const result = await sql`SELECT version()`;
	console.log(result[0]);
}

getPgVersion();

/* --- */

/* https://neon.com/docs/guides/nextjs */

// Server Components
// In your server components using the App Router, add the following code snippet to connect to your Neon database:
/* import { neon } from '@neondatabase/serverless';

async function getData() {
  const sql = neon(process.env.DATABASE_URL);
  const response = await sql`SELECT version()`;
  return response[0].version;
}

export default async function Page() {
  const data = await getData();
  return <>{data}</>;
} */

// Server Actions
// In your server actions using the App Router, add the following code snippet to connect to your Neon database:
/*import { neon } from '@neondatabase/serverless';

export default async function Page() {
  async function create(formData: FormData) {
    "use server";
    const sql = neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS comments (comment TEXT)`;
    const comment = formData.get("comment");
    await sql("INSERT INTO comments (comment) VALUES ($1)", [comment]);
  }
  return (
    <form action={create}>
      <input type="text" placeholder="write a comment" name="comment" />
      <button type="submit">Submit</button>
    </form>
  );
}*/

// Serverless Functions
// From your Serverless Functions, add the following code snippet to connect to your Neon database:
/*import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const response = await sql`SELECT version()`;
  const { version } = response[0];
  res.status(200).json({ version });
}*/

// Edge Functions
// From your Edge Functions, add the following code snippet and connect to your Neon database using the Neon serverless driver:
/*export const config = {
  runtime: 'edge',
};

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const response = await sql`SELECT version()`;
  const { version } = response[0];
  return Response.json({ version });
}*/
