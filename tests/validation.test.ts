import { test, expect } from "bun:test";
import { assertNonEmpty, assertValidSlug } from "../src/validation/rules";
import { GraphQLError } from "graphql";

test("assertNonEmpty passes for a non-empty string", () => {
  expect(() => assertNonEmpty("hello", "title")).not.toThrow();
});

test("assertNonEmpty throws for an empty string", () => {
  expect(() => assertNonEmpty("", "title")).toThrow(GraphQLError);
});

test("assertNonEmpty throws for a whitespace-only string", () => {
  expect(() => assertNonEmpty("   ", "content")).toThrow(GraphQLError);
});

test("assertValidSlug passes for a valid slug", () => {
  expect(() => assertValidSlug("my-collection")).not.toThrow();
});

test("assertValidSlug passes for a single-word slug", () => {
  expect(() => assertValidSlug("notes")).not.toThrow();
});

test("assertValidSlug throws for uppercase letters", () => {
  expect(() => assertValidSlug("My-Collection")).toThrow(GraphQLError);
});

test("assertValidSlug throws for spaces", () => {
  expect(() => assertValidSlug("my collection")).toThrow(GraphQLError);
});

test("assertValidSlug throws for leading/trailing hyphens", () => {
  expect(() => assertValidSlug("-my-collection-")).toThrow(GraphQLError);
});

test("assertValidSlug throws for consecutive hyphens", () => {
  expect(() => assertValidSlug("my--collection")).toThrow(GraphQLError);
});