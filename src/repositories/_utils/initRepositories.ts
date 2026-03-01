import { Kysely } from 'kysely';
import { SQLocalKysely } from 'sqlocal/kysely';
import { RepositoryClasses } from '@/repositories';
import type { Database, Repositories } from '@/repositories';

export const initRepositories = async (uuid: string) => {
  const sqlocal = new SQLocalKysely({ databasePath: `local:${uuid}` });
  const db = new Kysely<Database>({ dialect: sqlocal.dialect });
  const repo = Object.fromEntries(
    Object.entries(RepositoryClasses).map(([key, Repository]) => [key, new Repository(db)] as const)
  ) as Omit<Repositories, 'withTransaction'>;

  await Promise.all(Object.values(repo).map(repository => repository.initialize()));
  return {
    ...repo,
    withTransaction: callback => db.transaction().execute(callback),
  } satisfies Repositories;
};
