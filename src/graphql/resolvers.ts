import { prisma } from "../db/client";
import { assertNonEmpty, assertValidSlug } from "../validation/rules";
import { GraphQLError } from "graphql";

interface DocumentsArgs {
  collectionId?: string;
  search?: string;
  isArchived?: boolean;
  take?: number;
  cursor?: string | null;
}

interface CreateCollectionArgs {
  name: string;
  slug: string;
}

interface CreateDocumentArgs {
  title: string;
  content: string;
  tags?: string[];
  collectionId: string;
}

interface UpdateDocumentArgs {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
}

interface MoveDocumentArgs {
  id: string;
  collectionId: string;
}

function toISOString(date: Date): string {
  return date.toISOString();
}

async function getCollectionOrThrow(id: string) {
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) {
    throw new GraphQLError(`Collection with id "${id}" not found`, {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return collection;
}

async function getDocumentOrThrow(id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw new GraphQLError(`Document with id "${id}" not found`, {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return document;
}

export const resolvers = {
  Query: {
    collections: () => {
      return prisma.collection.findMany({ orderBy: { createdAt: "desc" } });
    },

    collection: async (_parent: unknown, args: { id: string }) => {
      return prisma.collection.findUnique({
        where: { id: args.id },
        include: { documents: true },
      });
    },

    documents: async (_parent: unknown, args: DocumentsArgs) => {
      const take = args.take ?? 20;

      const where: Record<string, unknown> = {};
      if (args.collectionId) where.collectionId = args.collectionId;
      if (typeof args.isArchived === "boolean") where.isArchived = args.isArchived;
      if (args.search) {
        where.OR = [
          { title: { contains: args.search, mode: "insensitive" } },
          { content: { contains: args.search, mode: "insensitive" } },
        ];
      }

      const items = await prisma.document.findMany({
        where,
        take: take + 1,
        ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
      });

      const hasMore = items.length > take;
      const page = hasMore ? items.slice(0, take) : items;
      const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

      return { items: page, nextCursor };
    },
  },

  Collection: {
    documents: (parent: { id: string; documents?: unknown }) => {
      if (parent.documents) return parent.documents;
      return prisma.document.findMany({ where: { collectionId: parent.id } });
    },
    createdAt: (parent: { createdAt: Date }) => toISOString(parent.createdAt),
  },

  Document: {
    createdAt: (parent: { createdAt: Date }) => toISOString(parent.createdAt),
  },

  Mutation: {
    createCollection: async (_parent: unknown, args: CreateCollectionArgs) => {
      assertNonEmpty(args.name, "name");
      assertValidSlug(args.slug);

      const existing = await prisma.collection.findUnique({ where: { slug: args.slug } });
      if (existing) {
        throw new GraphQLError(`Collection with slug "${args.slug}" already exists`, {
          extensions: { code: "BAD_USER_INPUT", field: "slug" },
        });
      }

      return prisma.collection.create({
        data: { name: args.name, slug: args.slug },
      });
    },

    createDocument: async (_parent: unknown, args: CreateDocumentArgs) => {
      assertNonEmpty(args.title, "title");
      assertNonEmpty(args.content, "content");
      await getCollectionOrThrow(args.collectionId);

      return prisma.document.create({
        data: {
          title: args.title,
          content: args.content,
          tags: args.tags ?? [],
          collectionId: args.collectionId,
        },
      });
    },

    updateDocument: async (_parent: unknown, args: UpdateDocumentArgs) => {
      await getDocumentOrThrow(args.id);

      if (args.title !== undefined) assertNonEmpty(args.title, "title");
      if (args.content !== undefined) assertNonEmpty(args.content, "content");

      const data: Record<string, unknown> = {};
      if (args.title !== undefined) data.title = args.title;
      if (args.content !== undefined) data.content = args.content;
      if (args.tags !== undefined) data.tags = args.tags;
      if (args.isArchived !== undefined) data.isArchived = args.isArchived;

      return prisma.document.update({ where: { id: args.id }, data });
    },

    deleteDocument: async (_parent: unknown, args: { id: string }) => {
      await getDocumentOrThrow(args.id);
      await prisma.document.delete({ where: { id: args.id } });
      return true;
    },

    moveDocument: async (_parent: unknown, args: MoveDocumentArgs) => {
      await getDocumentOrThrow(args.id);
      await getCollectionOrThrow(args.collectionId);

      return prisma.document.update({
        where: { id: args.id },
        data: { collectionId: args.collectionId },
      });
    },
  },
};