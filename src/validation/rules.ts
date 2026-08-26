import { GraphQLError } from "graphql";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function assertNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new GraphQLError(`${fieldName} must not be empty`, {
      extensions: { code: "BAD_USER_INPUT", field: fieldName },
    });
  }
}

export function assertValidSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new GraphQLError(
      "slug must be lowercase alphanumeric with hyphens only (e.g. 'my-collection')",
      { extensions: { code: "BAD_USER_INPUT", field: "slug" } }
    );
  }
}