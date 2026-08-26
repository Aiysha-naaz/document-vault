import { test, expect, beforeAll, afterAll } from "bun:test";
import { prisma } from "../src/db/client";
import { resolvers } from "../src/graphql/resolvers";

let testCollectionId: string;

beforeAll(async () => {
  await prisma.document.deleteMany({ where: { collection: { slug: { startsWith: "it-test-" } } } });
  await prisma.collection.deleteMany({ where: { slug: { startsWith: "it-test-" } } });
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { collection: { slug: { startsWith: "it-test-" } } } });
  await prisma.collection.deleteMany({ where: { slug: { startsWith: "it-test-" } } });
  await prisma.$disconnect();
});

test("full lifecycle: create collection, create document, search, move, delete", async () => {
  const collectionA = await resolvers.Mutation.createCollection(null, {
    name: "IT Test A",
    slug: "it-test-a",
  });
  expect(collectionA.slug).toBe("it-test-a");
  testCollectionId = collectionA.id;

  const collectionB = await resolvers.Mutation.createCollection(null, {
    name: "IT Test B",
    slug: "it-test-b",
  });

  const doc = await resolvers.Mutation.createDocument(null, {
    title: "Integration Test Doc",
    content: "This document mentions the word banana for search testing",
    tags: ["integration", "test"],
    collectionId: testCollectionId,
  });
  expect(doc.title).toBe("Integration Test Doc");

  const searchResult = await resolvers.Query.documents(null, {
    search: "banana",
  });
  expect(searchResult.items.some((d: { id: string }) => d.id === doc.id)).toBe(true);

  const fetchedCollection = await resolvers.Query.collection(null, {
    id: testCollectionId,
  });
  expect(fetchedCollection).not.toBeNull();

  const moved = await resolvers.Mutation.moveDocument(null, {
    id: doc.id,
    collectionId: collectionB.id,
  });
  expect(moved.collectionId).toBe(collectionB.id);

  const deleted = await resolvers.Mutation.deleteDocument(null, { id: doc.id });
  expect(deleted).toBe(true);

  const afterDelete = await prisma.document.findUnique({ where: { id: doc.id } });
  expect(afterDelete).toBeNull();
});

test("cursor pagination returns nextCursor when more items exist", async () => {
  const collection = await resolvers.Mutation.createCollection(null, {
    name: "IT Test Paging",
    slug: "it-test-paging",
  });

  for (let i = 0; i < 5; i++) {
    await resolvers.Mutation.createDocument(null, {
      title: `Paged Doc ${i}`,
      content: "paging content",
      collectionId: collection.id,
    });
  }

  const page1 = await resolvers.Query.documents(null, {
    collectionId: collection.id,
    take: 2,
  });
  expect(page1.items.length).toBe(2);
  expect(page1.nextCursor).not.toBeNull();

  const page2 = await resolvers.Query.documents(null, {
    collectionId: collection.id,
    take: 2,
    cursor: page1.nextCursor,
  });
  expect(page2.items.length).toBe(2);
  const firstItemPage1 = page1.items[0];
  const firstItemPage2 = page2.items[0];
  expect(firstItemPage1).toBeDefined();
  expect(firstItemPage2).toBeDefined();
  expect(firstItemPage2?.id).not.toBe(firstItemPage1?.id);
});