import { test, expect, mock, beforeEach } from "bun:test";
import { GraphQLError } from "graphql";

interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

interface DocumentRow {
  id: string;
  title: string;
  content: string;
  collectionId: string;
}

const mockPrisma = {
  collection: {
    findMany: mock((): Promise<CollectionRow[]> => Promise.resolve([])),
    findUnique: mock((): Promise<CollectionRow | null> => Promise.resolve(null)),
    create: mock((): Promise<CollectionRow> =>
      Promise.resolve({ id: "0", name: "", slug: "", createdAt: new Date() })
    ),
  },
  document: {
    findMany: mock((): Promise<DocumentRow[]> => Promise.resolve([])),
    findUnique: mock((): Promise<DocumentRow | null> => Promise.resolve(null)),
    create: mock((): Promise<DocumentRow> =>
      Promise.resolve({ id: "0", title: "", content: "", collectionId: "" })
    ),
    update: mock((): Promise<DocumentRow> =>
      Promise.resolve({ id: "0", title: "", content: "", collectionId: "" })
    ),
    delete: mock((): Promise<DocumentRow> =>
      Promise.resolve({ id: "0", title: "", content: "", collectionId: "" })
    ),
  },
};

mock.module("../src/db/client", () => ({ prisma: mockPrisma }));

const { resolvers } = await import("../src/graphql/resolvers");

beforeEach(() => {
  mockPrisma.collection.findMany.mockClear();
  mockPrisma.collection.findUnique.mockClear();
  mockPrisma.collection.create.mockClear();
  mockPrisma.document.findMany.mockClear();
  mockPrisma.document.findUnique.mockClear();
  mockPrisma.document.create.mockClear();
  mockPrisma.document.update.mockClear();
  mockPrisma.document.delete.mockClear();
});

test("createCollection rejects an empty name", async () => {
  await expect(
    resolvers.Mutation.createCollection(null, { name: "", slug: "valid-slug" })
  ).rejects.toThrow(GraphQLError);
});

test("createCollection rejects a malformed slug", async () => {
  await expect(
    resolvers.Mutation.createCollection(null, { name: "Notes", slug: "Bad Slug" })
  ).rejects.toThrow(GraphQLError);
});

test("createCollection rejects a duplicate slug", async () => {
  mockPrisma.collection.findUnique.mockImplementationOnce(() =>
    Promise.resolve({ id: "1", name: "Existing", slug: "notes", createdAt: new Date() })
  );

  await expect(
    resolvers.Mutation.createCollection(null, { name: "Notes", slug: "notes" })
  ).rejects.toThrow(GraphQLError);
});

test("createCollection creates when valid and unique", async () => {
  mockPrisma.collection.findUnique.mockImplementationOnce(() => Promise.resolve(null));
  mockPrisma.collection.create.mockImplementationOnce(() =>
    Promise.resolve({ id: "1", name: "Notes", slug: "notes", createdAt: new Date() })
  );

  const result = await resolvers.Mutation.createCollection(null, {
    name: "Notes",
    slug: "notes",
  });

  expect(result.slug).toBe("notes");
  expect(mockPrisma.collection.create).toHaveBeenCalledTimes(1);
});

test("createDocument rejects an empty title", async () => {
  await expect(
    resolvers.Mutation.createDocument(null, {
      title: "",
      content: "Some content",
      collectionId: "col-1",
    })
  ).rejects.toThrow(GraphQLError);
});

test("createDocument rejects when collection does not exist", async () => {
  mockPrisma.collection.findUnique.mockImplementationOnce(() => Promise.resolve(null));

  await expect(
    resolvers.Mutation.createDocument(null, {
      title: "Title",
      content: "Content",
      collectionId: "missing-id",
    })
  ).rejects.toThrow(GraphQLError);
});

test("moveDocument rejects when document does not exist", async () => {
  mockPrisma.document.findUnique.mockImplementationOnce(() => Promise.resolve(null));

  await expect(
    resolvers.Mutation.moveDocument(null, { id: "missing-doc", collectionId: "col-1" })
  ).rejects.toThrow(GraphQLError);
});

test("moveDocument rejects when target collection does not exist", async () => {
  mockPrisma.document.findUnique.mockImplementationOnce(() =>
    Promise.resolve({ id: "doc-1", title: "T", content: "C", collectionId: "old-col" })
  );
  mockPrisma.collection.findUnique.mockImplementationOnce(() => Promise.resolve(null));

  await expect(
    resolvers.Mutation.moveDocument(null, { id: "doc-1", collectionId: "missing-col" })
  ).rejects.toThrow(GraphQLError);
});

test("moveDocument updates collectionId when both exist", async () => {
  mockPrisma.document.findUnique.mockImplementationOnce(() =>
    Promise.resolve({ id: "doc-1", title: "T", content: "C", collectionId: "old-col" })
  );
  mockPrisma.collection.findUnique.mockImplementationOnce(() =>
    Promise.resolve({ id: "new-col", name: "New", slug: "new", createdAt: new Date() })
  );
  mockPrisma.document.update.mockImplementationOnce(() =>
    Promise.resolve({ id: "doc-1", title: "T", content: "C", collectionId: "new-col" })
  );

  const result = await resolvers.Mutation.moveDocument(null, {
    id: "doc-1",
    collectionId: "new-col",
  });

  expect(result.collectionId).toBe("new-col");
});

test("deleteDocument rejects when document does not exist", async () => {
  mockPrisma.document.findUnique.mockImplementationOnce(() => Promise.resolve(null));

  await expect(
    resolvers.Mutation.deleteDocument(null, { id: "missing" })
  ).rejects.toThrow(GraphQLError);
});

test("deleteDocument returns true on success", async () => {
  mockPrisma.document.findUnique.mockImplementationOnce(() =>
    Promise.resolve({ id: "doc-1", title: "T", content: "C", collectionId: "col-1" })
  );
  mockPrisma.document.delete.mockImplementationOnce(() =>
    Promise.resolve({ id: "doc-1", title: "T", content: "C", collectionId: "col-1" })
  );

  const result = await resolvers.Mutation.deleteDocument(null, { id: "doc-1" });
  expect(result).toBe(true);
});