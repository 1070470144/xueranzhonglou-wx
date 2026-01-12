# <!--
# Sync Impact Report
# Version change: [unspecified] -> 0.2.0
# Modified principles:
#  - ADDED: UI Component Priority (UNI-APP-FIRST)
# Added sections:
#  - None (principles expanded)
# Removed sections:
#  - None
# Templates requiring updates:
#  - .specify/templates/spec-template.md: ⚠ pending (ensure UI component preference reflected)
#  - .specify/templates/plan-template.md: ⚠ pending (align planning steps with UI-first rule)
#  - .specify/templates/tasks-template.md: ⚠ pending (ensure task categories reflect UI component usage)
#  - .specify/templates/commands/*.md: ✅ inspected (no agent-specific references found) / ⚠ verify after edits
# Follow-up TODOs:
#  - TODO(RATIFICATION_DATE): confirm original ratification date and replace placeholder
#  - Update spec/plan templates to include "Use uni-app built-in components" guidance
# -->

# xueran Constitution

## Core Principles

### UI Component Priority (UNI-APP-FIRST)
Project UI MUST prioritize the use of uni-app's built-in components and official component libraries
before introducing custom components. Custom components are permitted only when:
- the built-in component cannot meet functional requirements (documented justification required),
- or cross-platform compatibility cannot be achieved otherwise.

Rationale: Using the framework's native components maximizes cross-platform compatibility,
reduces maintenance burden, ensures consistent look-and-feel, and leverages tested accessibility
and performance optimizations provided by uni-app.

### Test-First (TDD) (NON-NEGOTIABLE)
All feature work MUST follow Test-Driven Development: write failing tests first, implement the
minimal code to make tests pass, then refactor while keeping tests green. Tests MUST be added for
unit, component, and integration boundaries as appropriate. The project enforces a minimum
coverage threshold of 90% across statements, branches, functions, and lines for merged code.

Rationale: TDD ensures higher quality, prevents regressions, and makes refactors safe and reliable.

### Cloud Objects for Cloud Functions
All cloud-side logic MUST be implemented using cloud objects (uniCloud object pattern) where the
platform supports it. Cloud objects provide standardized input/output, centralized validation,
and improved testability; they also make client invocation simpler and more consistent.

Rationale: Standardizing on cloud objects reduces ad-hoc implementations and eases client-server
integration and testing.

### Cross-Platform Compatibility
All code, components, and assets MUST remain compatible with both HBuilderX previews and the
WeChat Mini Program runtime. Avoid platform-specific APIs unless guarded with feature-detection
and documented fallbacks. UI, navigation, and storage behavior must be tested on both platforms.

Rationale: The project targets multiple runtimes; compatibility guarantees reduce platform-specific
bugs and ensure broader user reach.

### Performance & Observability
UI interactions MUST feel instantaneous (target UI response ≤ 100ms) and page load times should
remain within defined thresholds. Instrumentation for key UI performance metrics and error
reporting SHOULD be present in components where delays or failures would harm UX.

Rationale: Performance directly impacts user satisfaction; observability enables proactive
diagnosis and continuous improvement.

## Additional Constraints
All new UI work MUST prefer uni-app built-in components, and custom styles should adhere to the
project's design tokens and spacing rules. Component libraries included from uni_modules are
acceptable if they are maintained and compatible with the project's uni-app and HBuilderX versions.

The project enforces TDD and coverage requirements; CI will block merges that reduce coverage
below thresholds. Visual regression tests are required for UI changes that alter layout or
components visible to users.

## Development Workflow & Quality Gates
- Feature branches MUST reference a spec in `specs/` and link to the corresponding issue or ticket.
- All code changes require at least one approving reviewer and passing CI (tests + coverage + linters)
  before merge. Visual changes MUST include baseline screenshots and a short visual diff note.
- Performance regressions detected by CI or monitoring require remediation before merge.

## Governance
Amendments to this Constitution require a documented proposal (spec or PR), at least two approvers
from the maintainers team, and an implementation plan if the change affects code or tests.
Minor clarifications (typos, wording) may be applied with a patch version bump; adding a new
principle or materially changing governance requires a minor version bump.

**Version**: 0.2.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original date | **Last Amended**: 2026-01-12
