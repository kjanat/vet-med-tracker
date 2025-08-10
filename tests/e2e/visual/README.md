# Visual Regression Testing with Percy

This directory contains comprehensive visual regression tests for the VetMed Tracker application using Percy and Playwright.

## Overview

Visual regression testing ensures that UI changes don't introduce unintended visual regressions. Our setup provides:

- **Comprehensive Coverage**: All major views and components
- **Responsive Testing**: Multiple breakpoints and device types
- **State Testing**: Different component states (empty, loading, error, success)
- **Dark Mode Support**: Light and dark theme variations
- **Automated CI Integration**: Runs on every pull request

## Setup and Configuration

### 1. Install Dependencies

```bash
pnpm install
```

This installs `@percy/playwright` along with other testing dependencies.

### 2. Percy Project Setup

1. Create a Percy account at [percy.io](https://percy.io)
2. Create a new project for "VetMed Tracker"
3. Get your `PERCY_TOKEN` from project settings
4. Add the token to your environment:

```bash
export PERCY_TOKEN=your_percy_token_here
```

### 3. Environment Variables

Required environment variables for visual tests:

```bash
# Percy Configuration
PERCY_TOKEN=your_percy_token_here

# Test Database
DATABASE_URL=your_test_database_url

# Stack Auth (Test Keys)
NEXT_PUBLIC_STACK_PROJECT_ID=test_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=test_publishable_key
STACK_SECRET_SERVER_KEY=test_secret_key
```

## Running Visual Tests

### Local Development

```bash
# Run all visual tests
pnpm test:visual

# Update visual baselines (use carefully!)
pnpm test:visual:update

# Run specific test file
percy exec -- playwright test tests/e2e/visual/dashboard.spec.ts

# Run with specific browser
percy exec -- playwright test tests/e2e/visual/ --project=visual-chromium
```

### CI/CD Integration

Visual tests run automatically on:
- Pull requests (compare against target branch)
- Pushes to master (update baselines)
- Manual workflow dispatch

## Test Structure

### Test Files

- **`dashboard.spec.ts`** - Dashboard views, widgets, reporting
- **`animals.spec.ts`** - Animal management, profiles, forms
- **`medications.spec.ts`** - Medication features, dosage calculator
- **`administration.spec.ts`** - Medication recording interface
- **`responsive.spec.ts`** - Responsive design across breakpoints

### Helper Functions (`visual-helpers.ts`)

#### Core Functions

```typescript
// Take a visual snapshot
await takeVisualSnapshot(page, {
  name: 'Component Name',
  waitFor: ['[data-testid="element"]'],
  waitForNetworkIdle: true,
});

// Test responsive breakpoints
await testResponsiveView(page, 'Page Name', {
  waitFor: ['[data-testid="content"]'],
});

// Test different component states
await testComponentStates(page, 'Component', [
  {
    name: 'Empty State',
    setup: async () => {
      // Setup code for this state
    },
  },
]);
```

#### Mock Functions

```typescript
// Mock authenticated user
await mockAuthenticatedUser(page);

// Mock household and animal data
await mockHouseholdData(page);

// Mock medication data
await setupMedicationTestData(page);
```

### Configuration Files

#### `.percy.yml`

Main Percy configuration:
- Responsive breakpoints: 375px, 768px, 1024px, 1440px, 1920px
- Visual difference threshold: 5%
- Auto-approval for minor changes
- Ignore regions for dynamic content

#### `playwright.config.ts`

Visual testing project configuration:
- Separate project for visual tests
- Chromium browser for consistency
- Disabled video/screenshot to avoid conflicts

## Best Practices

### 1. Stable Visual Tests

- Wait for loading states to complete
- Hide dynamic content (timestamps, IDs)
- Disable animations for consistency
- Use stable test data

### 2. Meaningful Test Names

```typescript
// Good
await takeVisualSnapshot(page, {
  name: 'Dashboard Overview - Empty State',
});

// Bad
await takeVisualSnapshot(page, {
  name: 'Test 1',
});
```

### 3. Responsive Testing

Test critical layouts at multiple breakpoints:
- Mobile: 375px, 667px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1920px

### 4. State Coverage

Test different component states:
- Empty states
- Loading states
- Error states
- Success states
- Different data volumes

## Troubleshooting

### Common Issues

#### 1. Test Timeouts

```bash
# Increase timeout for slow loading
await page.waitForLoadState('networkidle', { timeout: 30000 });
```

#### 2. Dynamic Content

Add elements to ignore regions in `.percy.yml`:

```yaml
ignore-regions:
  - selector: '[data-testid="timestamp"]'
  - selector: '.dynamic-content'
```

#### 3. Authentication Issues

Ensure test authentication mocks are properly set up:

```typescript
await mockAuthenticatedUser(page);
```

#### 4. Database State

Reset database state between tests:

```bash
pnpm db:seed
```

### Debug Mode

Enable Percy debugging:

```bash
DEBUG=percy* pnpm test:visual
```

### Local Testing

Test without Percy to debug Playwright issues:

```bash
playwright test tests/e2e/visual/ --headed
```

## CI/CD Configuration

### GitHub Actions

The `.github/workflows/visual-regression.yml` workflow:

1. **Setup**: Install dependencies, build app
2. **Database**: Run migrations, seed test data
3. **Tests**: Execute visual regression tests
4. **Results**: Comment PR with Percy build link
5. **Notifications**: Slack alerts for failures

### Required Secrets

Add these secrets to GitHub repository settings:

```
PERCY_TOKEN                          # Percy project token
TEST_DATABASE_URL                    # Test database connection
TEST_STACK_PROJECT_ID               # Stack Auth test project
TEST_STACK_PUBLISHABLE_CLIENT_KEY   # Stack Auth test key
TEST_STACK_SECRET_SERVER_KEY        # Stack Auth test secret
SLACK_WEBHOOK_URL                   # Optional: Slack notifications
```

### Auto-Approval Rules

Changes are auto-approved if:
- Visual difference < 5%
- No changes to critical elements (medication doses, alerts)
- No new errors or broken layouts

### Manual Review Required

Manual review is required for:
- Changes > 5% difference
- Changes to critical UI elements
- New error states
- Security-related interfaces

## Performance Considerations

### Test Optimization

- Use stable CSS to reduce rendering differences
- Minimize network requests during tests
- Batch similar tests together
- Use appropriate wait strategies

### Resource Management

- Limit concurrent test execution
- Clean up test data after runs
- Monitor Percy monthly snapshot limits
- Optimize image compression settings

## Maintenance

### Regular Tasks

1. **Monthly**: Review and clean up unused snapshots
2. **Weekly**: Update test data for realistic visuals
3. **Per Release**: Validate critical path coverage
4. **On Breakage**: Investigate and fix flaky tests

### Updating Baselines

```bash
# For approved UI changes
pnpm test:visual:update

# For specific component changes
percy exec -- playwright test tests/e2e/visual/dashboard.spec.ts --update-snapshots
```

### Adding New Tests

1. Create test file in `tests/e2e/visual/`
2. Use helper functions from `visual-helpers.ts`
3. Follow naming conventions
4. Test multiple states and breakpoints
5. Add to CI workflow if needed

## Quality Metrics

### Coverage Goals

- **Pages**: 100% of critical user paths
- **Components**: 90% of reusable components
- **States**: All major states (empty, loading, error)
- **Responsive**: All breakpoints for critical pages
- **Themes**: Light and dark mode for key interfaces

### Success Metrics

- **False Positive Rate**: <5%
- **Test Stability**: >95% pass rate
- **Detection Rate**: Catch 90% of visual regressions
- **Performance**: Tests complete in <15 minutes
- **Team Adoption**: Used by 100% of UI changes

## Support and Resources

- **Percy Documentation**: [percy.io/docs](https://percy.io/docs)
- **Playwright Guides**: [playwright.dev](https://playwright.dev)
- **Team Wiki**: Internal documentation
- **Slack Channel**: #visual-testing (if available)

For questions or issues with visual testing, please refer to this documentation first, then reach out to the QA team.