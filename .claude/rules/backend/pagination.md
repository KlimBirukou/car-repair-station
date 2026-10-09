---
paths:
  - "backend/src/main/java/**/*.java"
---

# Rule: Pagination and Filtering

## Default

Unless explicitly overridden by the project specification:

- **What:** Every endpoint that returns a collection is paginated and filtered through a filter record.
- **When:** For every list or search operation.
- **Where:** `Page`/`Pageable` (Spring Data Commons) are used in the controller parameter, the service and the
  repository port. `PageResponse<T>` lives in `common/web`.
- **How:**
    - The controller accepts `Pageable` (`page`, `size`, `sort` query parameters) and the filter parameters, builds
      `<Feature>Filter` from `<Feature>FilterRequest` through the web mapper, calls the service, and returns
      `PageResponse.of(page, webMapper::toResponse)`.
    - `PageResponse` has `content`, `page` (zero-based), `size`, `totalElements`, `totalPages`. Nothing else from `Page`
      is exposed.
    - A filter record has nullable fields. `null` means "no condition". A new filter means: a field in the record, a
      method in the specification, a line in `byFilter` (see the Repositories rule).
    - Sorting is limited to a whitelist of properties per endpoint. An unknown sort property gives 400. The last sort
      key is always `id`, so the order is deterministic. `PageRequests.restrict(pageable, ...)` in `common/web` does
      both (see the Web rule).
    - The default and the maximum page size are configured; a larger request is capped.

Example:

```java
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <S, T> PageResponse<T> of(Page<S> page, Function<S, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
            page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
```

## Why

- Serializing `PageImpl` directly is not supported by Spring Data: the JSON structure is not guaranteed to stay stable.
  A dedicated response type is an explicit contract and gives a clean OpenAPI schema for generated clients.
- Without a deterministic order, pages can overlap or skip rows.
- A maximum page size protects the database from "give me everything" requests.

## Exceptions

A collection that the specification explicitly declares small and bounded may be returned without pagination.
Declared small and bounded: the payments and the history of one order, the search result (5 of each kind), and the list
of active mechanics (`GET /employees/mechanics`, the staff of one station).

## Prohibitions

- Never serialize `Page`, `PageImpl` or `Slice` to JSON.
- No collection endpoint without pagination.
- No per-filter repository methods (`findByXAndY`).
- No sorting by a property the client supplied without the whitelist check.
- No `Pageable` or `Page` types in request/response bodies.

## Infrastructure

- Spring Data web support for `Pageable` arguments.
- Configuration: `spring.data.web.pageable.default-page-size` and `spring.data.web.pageable.max-page-size`.

## Verification

- Integration test: a list endpoint returns exactly the `PageResponse` fields; `size` above the maximum is capped; an
  unknown sort property returns 400.
- ArchUnit: controller methods do not return `Page`, `Slice` or `ResponseEntity<Page<...>>`.
