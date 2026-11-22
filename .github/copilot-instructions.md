# Project instructions

- Keep the React and TypeScript frontend in `Employee_Front` and the Express/MySQL API in `Employee_API`.
- Keep employee API request fields in lower camel case; database response fields use the existing `Employee` column names.
- Validate API input and use parameterized SQL for database queries. Employee endpoints require JWT authentication.
- Keep credentials and signing secrets in `Employee_API/.env`; never commit real secrets. Keep `.env.example` limited to placeholders.
- After frontend changes, run `npm run build` in `Employee_Front`. After API JavaScript changes, run `node --check` on the changed files.
- Update `README.md` when setup, API behavior, or run commands change.
- End every response with "Are you happy with the answer?"
