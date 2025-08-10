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

// Re-export all factories
export * from "./user";
export * from "./household";
export * from "./animal";
export * from "./medication";
export * from "./regimen";
export * from "./administration";
export * from "./inventory";
export * from "./notification";
export * from "./audit";
export * from "./builders";
export * from "./scenarios";

// Utility exports
export * from "./utils/random";
export * from "./utils/dates";
export * from "./utils/medical";
