export type ReadmeSource = { kind: 'browse' } | { kind: 'collection'; id: string; name?: string };

export type ReadmeRouteState = {
  readme?: {
    repoId: string;
    owner: string;
    name: string;
    source: ReadmeSource;
  };
};

export type ReadmeReturn =
  | { to: '/'; source: 'browse' }
  | { to: string; source: 'collection'; collectionName?: string };

const collectionPath = /^\/collections\/([A-Za-z0-9_-]+)\/?$/;

export function createReadmeDestination(
  owner: string,
  name: string,
  repoId: string,
  pathname: string,
  collectionName?: string,
) {
  const collection = pathname.match(collectionPath);
  const source: ReadmeSource = collection
    ? { kind: 'collection', id: collection[1] as string, name: collectionName }
    : { kind: 'browse' };

  return {
    to: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
    state: { readme: { repoId, owner, name, source } } satisfies ReadmeRouteState,
  };
}

export function resolveReadmeReturn(
  state: ReadmeRouteState | null | undefined,
  owner: string,
  name: string,
): ReadmeReturn {
  const context = state?.readme;
  const sameRepository =
    context?.owner.toLowerCase() === owner.toLowerCase() &&
    context.name.toLowerCase() === name.toLowerCase();
  if (!sameRepository || !context) {
    return { to: '/', source: 'browse' };
  }
  if (context.source.kind === 'collection' && /^[A-Za-z0-9_-]+$/.test(context.source.id)) {
    return {
      to: `/collections/${context.source.id}`,
      source: 'collection',
      collectionName: context.source.name,
    };
  }
  return { to: '/', source: 'browse' };
}
