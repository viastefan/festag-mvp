# Auth Login / Register — historical rollback notes

Unified auth is the only entry: `/login` · `/register` · `/onboarding` · `/preparing`.

Legacy dual-product entry (`/dev/login`, Client|Developer chooser, `AuthPanelSwitchModal`,
`LoginPageLegacy` / `RegisterPageLegacy`) has been removed. Bookmarks to `/dev/login`
redirect to `/login` (middleware + page).

Execution Panel (`/dev/*`) remains a **post-auth workspace perspective** for permitted roles —
not a separate authentication product.

Git history and tags remain the source for any older dual-login UI if needed.
