import { Kysely } from 'kysely';
import { SQLocalKysely } from 'sqlocal/kysely';
import { RepositoryClasses } from '@/repositories';
import { runMigrations } from '@/repositories/_utils/runMigrations';
import type { Database, Repositories } from '@/repositories';

export const initRepositories = async (uuid: string) => {
  const sqlocal = new SQLocalKysely({ databasePath: `local:${uuid}` });
  const db = new Kysely<Database>({ dialect: sqlocal.dialect });
  await runMigrations(db);
  const repo = Object.fromEntries(
    Object.entries(RepositoryClasses).map(([key, Repository]) => [key, new Repository(db)] as const)
  ) as Omit<Repositories, 'withTransaction'>;
  return {
    ...repo,
    withTransaction: callback => db.transaction().execute(callback),
  } satisfies Repositories;
};
