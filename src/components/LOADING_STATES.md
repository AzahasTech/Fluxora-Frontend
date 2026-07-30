# Loading-state selectors

Loading surfaces keep their accessible `role="status"` and accessible label.
Tests that need a stable DOM hook should select the root `data-testid` from the
shared `LOADING_TEST_IDS` map in `Skeleton.tsx`:

| Surface | Selector |
| --- | --- |
| Shared block | `loading-skeleton-block` |
| Streams page | `loading-skeleton-streams` |
| Treasury overview | `loading-skeleton-treasury` |
| Recipient portal | `loading-skeleton-recipient` |

The selectors describe loading context, not individual visual rectangles. Do
not add test IDs to replace semantic queries for status announcements.
