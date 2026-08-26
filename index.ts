import { createYoga, createSchema } from "graphql-yoga";
import { readFileSync } from "fs";
import { join } from "path";
import { resolvers } from "./src/graphql/resolvers";

const typeDefs = readFileSync(
  join(import.meta.dir, "src/graphql/schema.graphql"),
  "utf-8"
);

const schema = createSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({ schema });

const server = Bun.serve({
  port: Number(process.env.PORT) || 4000,
  fetch: yoga.fetch,
});

console.log(`🚀 Server ready at http://localhost:${server.port}/graphql`);