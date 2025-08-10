/**
 * Test Data Factory System
 *
 * Comprehensive factory functions for generating consistent, maintainable test data
 * for the VetMed Tracker application.
 *
 * Usage:
 * - createUser() - Simple factory with random data
 * - createUser({ email: 'custom@example.com' }) - Factory with overrides
 * - UserBuilder.create().withEmail('test@example.com').build() - Builder pattern
 * - createTestScenario().withHousehold().withAnimals(3).build() - Complex scenarios
 */

export * from "./administration";
export * from "./animal";
export * from "./audit";
export * from "./builders";
export * from "./household";
export * from "./inventory";
export * from "./medication";
export * from "./notification";
export * from "./regimen";
export * from "./scenarios";
// Re-export all factories
export * from "./user";
export * from "./utils/dates";
export * from "./utils/medical";
// Utility exports
export * from "./utils/random";
