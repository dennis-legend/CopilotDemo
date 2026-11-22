```instructions
# React Instructions for Employee_Front

- Use React with TypeScript for the Employee_Front web application.
- Prefer function components and Hooks; do not introduce class components.
- Use clear PascalCase component names and camelCase variable, function, and prop names.
- Keep components focused and extract reusable logic into custom Hooks or utilities.
- Define TypeScript types or interfaces for props, state, API responses, and domain models.
- Organize code by feature when practical, grouping related components, Hooks, services, types, and tests.
- Reuse existing project structure and conventions before creating new folders or abstractions.
- Use React Router or the project's established routing package for navigation and protected routes.
- Centralize API configuration and request logic in the existing HTTP client or service layer.
- Normalize API data and error responses at the service boundary.
- Handle loading, empty, error, unauthorized, forbidden, and offline states explicitly.
- Treat API data as untrusted and validate it where practical.
- Use controlled form components and provide accessible, inline validation feedback.
- Prevent duplicate submissions and disable relevant actions while requests are pending.
- Use semantic HTML, associated labels, keyboard support, visible focus states, and meaningful alternative text.
- Avoid prop drilling by using Context, the existing state-management solution, or composition where appropriate.
- Avoid mutating props or state directly; use immutable updates and stable keys for lists.
- Keep side effects in `useEffect` or dedicated Hooks and include complete dependency arrays.
- Clean up timers, subscriptions, event listeners, and pending requests when components unmount.
- Use memoization only when it provides a measurable benefit; avoid unnecessary `useMemo`, `useCallback`, and `React.memo`.
- Use the project's existing styling system, design-system components, CSS Modules, or scoped styles consistently.
- Reuse theme tokens and existing components rather than duplicating styles.
- Avoid inline styles except for dynamic values that cannot be expressed through the styling system.
- Use environment variables for deployment-specific configuration and never commit secrets or credentials.
- Protect employee data and authentication tokens; do not log or expose sensitive values unnecessarily.
- Include unit and integration tests for important component behavior, API interactions, validation, and user flows.
- Test visible behavior and user interactions rather than implementation details where possible.
- Run the relevant lint, type-check, test, and build scripts before considering a change complete.
- Fix the underlying issue rather than masking errors or adding broad exception handling.
- Make focused changes and avoid unrelated refactors or public API changes.
```