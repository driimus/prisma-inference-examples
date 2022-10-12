# On prisma

## Type safety

### The good

- Types being generated is great.
- We're (for the most part) safely building select filters from OAS thanks to Prisma validation helpers.
- JSON fields are a pain to work with, but we can live with that for the sake of safety (would be nice to be able to provide JSON schemas and generate types from those).

### The bad

- [Payload type inference is inaccurate for advanced input arguments](https://github.com/prisma/prisma/issues/13850) - this makes prisma practically unusable in any system where cyclomatic complexity will end up in `select` or `include` filters.

## Migrations

We're using a bastion host and applying migrations by port tunneling in a GH Actions runner.

## Testing

- CI tests are running in jest shards.
- We truncate all the tables in between tests to achieve test isolation.

- Would have been nice to have [programmatic migrate commands](https://github.com/prisma/prisma/issues/4703). That would enable more complex setups such as using the same Postgres database with `pg_temp` to achieve isolation. For each test you would:

  1. connect to DB with `pg_temp` schema
  1. apply migrations
  1. run test
  1. drop the connection afterwards

- Can still parallelize the tests locally via a [jest custom environment](https://github.com/ctrlplusb/prisma-pg-jest), but the gains are limited - similar to sharding.

## Performance

- It's slow, but not slower than we expected.

### Bundling issues for AWS Lambda.

The prisma CLI is an optional dependency of the prisma client.

When included as a dev dependency, it and engines other than the query engine will get included in the bundle even when using the `--production` flag of our package manager. This results in significant bloat and brings the bundle size over the allowed limit of 50MB.

Our workaround was to only use the CLI via `npx`, but that means we have to pin its version whenever we use it to match that of the listed `@prisma/client` dependency.
