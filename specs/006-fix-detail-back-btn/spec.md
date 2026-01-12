# Feature Specification: Optimize Detail Page Back Arrow with Built-in Icons

**Feature Branch**: `006-fix-detail-back-btn`  
**Created**: 2026-01-12  
**Status**: Draft  
**Input**: User description: "优化 剧本详情界面左上角的返回箭头，使用自带的图标"

**Constitution Reminder**: For UI work, prefer uni-app built-in components; if custom components are proposed,
include a short justification in the spec explaining why built-ins are insufficient.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enhanced Back Navigation (Priority: P1)

As a user viewing script details, I want a clear and intuitive back arrow that uses built-in icons so that I can easily return to the previous page without confusion or visual clutter.

**Why this priority**: This is the primary navigation element on the detail page and directly impacts user experience and usability. Using built-in icons ensures consistency with the platform's design language.

**Independent Test**: Can be fully tested by verifying the back button uses built-in uni-icons component and successfully navigates back when tapped.

**Acceptance Scenarios**:

1. **Given** user is on the script detail page, **When** they tap the back arrow in the upper left corner, **Then** they return to the previous page
2. **Given** the back button uses built-in icons, **When** the page loads, **Then** the icon displays correctly and consistently across different devices

---

### User Story 2 - Visual Consistency (Priority: P2)

As a designer maintaining visual consistency across the app, I want the back arrow to use uni-app's built-in icon system so that all navigation elements follow the same design patterns and are compatible with the framework's theming.

**Why this priority**: Ensures the app maintains design consistency and leverages uni-app's built-in capabilities for better maintainability and performance.

**Independent Test**: Can be tested by verifying the icon implementation uses uni-icons component and matches the app's design system.

**Acceptance Scenarios**:

1. **Given** the back button implementation, **When** developers inspect the code, **Then** it uses the uni-icons component instead of custom icons
2. **Given** the app's theme changes, **When** the icon is rendered, **Then** it adapts appropriately to the uni-app icon system

---

### Edge Cases

- What happens when the uni-icons component fails to load or render?
- How does the icon appear on different screen densities and device types?
- What happens if the built-in icon library doesn't include the desired arrow style?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The back button in the script detail page MUST use uni-app's built-in uni-icons component
- **FR-002**: The back button MUST display a left-pointing arrow icon using the "left" or appropriate built-in icon type
- **FR-003**: The back button MUST maintain its current size (24px) and positioning in the upper left corner
- **FR-004**: The back button MUST retain its click functionality to navigate back using uni.navigateBack()
- **FR-005**: The back button MUST be accessible with appropriate aria-label and role attributes

### Key Entities *(include if feature involves data)*

- **BackButton**: Navigation element with built-in icon, click handler, and accessibility attributes
- **ScriptDetailPage**: Container page that includes the back button in its header navigation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Back button successfully uses uni-icons component and displays correctly on all target devices
- **SC-002**: Users can tap the back button and navigate to previous page without any visual or functional issues
- **SC-003**: The icon implementation follows uni-app best practices and maintains consistency with other navigation elements
- **SC-004**: No performance degradation compared to current implementation when using built-in icons