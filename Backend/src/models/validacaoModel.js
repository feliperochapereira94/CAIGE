export function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parsePagination(rawLimit, rawOffset, defaults = { limit: 50, maxLimit: 100 }) {
  const limitCandidate = Number.parseInt(rawLimit, 10);
  const offsetCandidate = Number.parseInt(rawOffset, 10);

  const safeLimit = Number.isInteger(limitCandidate)
    ? Math.min(Math.max(limitCandidate, 1), defaults.maxLimit)
    : defaults.limit;
  const safeOffset = Number.isInteger(offsetCandidate) && offsetCandidate >= 0
    ? offsetCandidate
    : 0;

  return { limit: safeLimit, offset: safeOffset };
}

export function normalizeIdArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => parsePositiveInt(value))
    .filter((value) => value !== null);
}

