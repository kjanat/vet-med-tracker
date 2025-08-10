# Test Data Factory System

Comprehensive factory functions for generating consistent, maintainable test data for the VetMed Tracker application.

## Overview

The factory system provides three levels of test data generation:

1. **Simple Factories** - Basic entity creation with random data
2. **Builder Pattern** - Fluent API for customized entity creation  
3. **Scenario Builders** - Complex multi-entity relationships and workflows

## Quick Start

```typescript
import { createUser, createAnimal, createMedication } from '@/tests/factories';

// Simple factory usage
const user = createUser({ email: 'test@example.com' });
const animal = createAnimal({ name: 'Buddy', species: 'dog' });
const medication = createMedication({ genericName: 'Amoxicillin' });
```

## Factory Functions

### Core Entities

#### User Factory
```typescript
import { createUser, UserBuilder, userPresets } from '@/tests/factories';

// Simple creation
const user = createUser();
const customUser = createUser({ email: 'custom@example.com' });

// Builder pattern
const complexUser = UserBuilder.create()
  .withEmail('test@example.com')
  .withName('John', 'Doe')
  .withPreferences({ weightUnit: 'kg', use24HourTime: true })
  .withOnboarding(true)
  .build();

// Presets
const newUser = userPresets.newUser();
const veterinarian = userPresets.veterinarian();
```

#### Animal Factory
```typescript
import { createAnimal, AnimalBuilder, animalPresets } from '@/tests/factories';

// Simple creation
const animal = createAnimal({ householdId: 'household-123' });

// Builder pattern
const seniorDog = AnimalBuilder.create()
  .withBasicInfo({ name: 'Max', species: 'dog', breed: 'Golden Retriever' })
  .withAge(12)
  .withWeight(35)
  .withConditions(['Arthritis', 'Hip dysplasia'])
  .withHousehold('household-123')
  .build();

// Presets
const healthyDog = animalPresets.healthyDog('household-123');
const seniorCat = animalPresets.seniorDogWithConditions('household-123');
```

#### Medication Factory
```typescript
import { createMedication, MedicationBuilder, medicationPresets } from '@/tests/factories';

// Builder pattern
const customMed = MedicationBuilder.create()
  .withBasicInfo({
    genericName: 'Carprofen',
    route: 'ORAL',
    form: 'TABLET'
  })
  .withDosing({ min: 2, max: 4, typical: 2.2 })
  .withContraindications(['kidney disease'])
  .build();

// Presets
const amoxicillin = medicationPresets.amoxicillin();
const carprofen = medicationPresets.carprofen();
```

## Builder Patterns

All major entities support builder patterns for flexible construction:

```typescript
import { UserBuilder, AnimalBuilder, RegimenBuilder } from '@/tests/factories';

const user = UserBuilder.create()
  .withEmail('vet@clinic.com')
  .withPreferences({ weightUnit: 'kg' })
  .withProfile({ bio: 'Licensed veterinarian' })
  .createdDaysAgo(365)
  .build();

const regimen = RegimenBuilder.create()
  .forAnimal('animal-123')
  .withMedication('med-456')
  .withFixedSchedule(['08:00', '20:00']) // BID
  .withDose('250 mg')
  .withDuration(new Date(), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  .build();
```

## Complex Scenarios

### Scenario Builder

Create complete test scenarios with relationships:

```typescript
import { TestScenarioBuilder } from '@/tests/factories';

const scenario = TestScenarioBuilder.create()
  .withUsers(2, 'completed') // Owner and caregiver
  .withHouseholds(1, 'family')
  .withHouseholdMembers(0, [0, 1], ['OWNER', 'CAREGIVER'])
  .withAnimals(2, 0, 'dog') // Two dogs in household 0
  .withMedications(3, 'antibiotic')
  .withRegimens(0, 0, 'bid') // Animal 0, Medication 0, twice daily
  .withAdministrations(0, 14, 0, 0) // 14 administrations for regimen 0
  .withInventory(0, 0, 'partial') // Partial inventory for medication 0
  .withNotifications(0, 0, 5) // 5 notifications for user 0
  .build();

// Access the generated data
const { users, households, animals, regimens } = scenario;
```

### Pre-built Scenarios

```typescript
import { quickScenarios, complexScenarios } from '@/tests/factories';

// Simple scenarios
const singleUser = quickScenarios.singleUserOnePet();
const family = quickScenarios.familyMultiplePets();
const clinic = quickScenarios.vetClinic();

// Complex scenarios
const medicationMgmt = complexScenarios.medicationManagement();
const petRescue = complexScenarios.petRescueScenario();
const emergency = complexScenarios.emergencyCareScenario();
```

## Compliance Data Generation

Generate realistic medication adherence patterns:

```typescript
import { ComplianceDataBuilder } from '@/tests/factories';

// Realistic compliance pattern (85% → 60% over time)
const realisticData = ComplianceDataBuilder.create()
  .forRegimen(regimen)
  .withRealisticPattern(30) // 30 days
  .build();

// Perfect compliance for testing
const perfectData = ComplianceDataBuilder.create()
  .forRegimen(regimen)
  .withPerfectCompliance(14) // 14 days
  .build();

// Poor compliance for edge case testing
const poorData = ComplianceDataBuilder.create()
  .forRegimen(regimen)
  .withPoorCompliance(21) // 21 days, 40% compliance
  .build();
```

## Specialized Factories

### Administration Factory
```typescript
import { AdministrationBuilder, administrationPresets } from '@/tests/factories';

// On-time administration
const onTime = administrationPresets.onTimeOral(regimenId, animalId, householdId, caregiverId);

// Late with excuse
const late = administrationPresets.lateWithExcuse(regimenId, animalId, householdId, caregiverId);

// With adverse event
const adverse = administrationPresets.withAdverseEvent(regimenId, animalId, householdId, caregiverId);
```

### Inventory Factory
```typescript
import { InventoryBuilder, inventoryPresets } from '@/tests/factories';

// Different inventory states
const newMed = inventoryPresets.newMedication(householdId, medicationId);
const lowStock = inventoryPresets.partiallyUsed(householdId, medicationId);
const expired = inventoryPresets.expiredMedication(householdId, medicationId);

// Custom inventory
const custom = InventoryBuilder.create()
  .inHousehold(householdId)
  .forMedication(medicationId)
  .withQuantity(60, 15) // 60 total, 15 remaining
  .expiresIn(6) // 6 months
  .withStorage('FRIDGE')
  .isInUse(30) // Opened 30 days ago
  .build();
```

## Utilities

### Random Data Generation

```typescript
import { random, person, animal, medical } from '@/tests/factories/utils/random';

// Random utilities
const uuid = random.uuid();
const number = random.int(1, 100);
const boolean = random.boolean(0.7); // 70% chance of true

// Person data
const firstName = person.firstName('female');
const email = person.email('john', 'doe');
const phone = person.phone();

// Animal data
const petName = animal.name();
const breed = animal.breed('dog');
const weight = animal.weight('cat');

// Medical data
const microchip = medical.microchipId();
```

### Date Utilities

```typescript
import { dates, times } from '@/tests/factories/utils/dates';

// Date generation
const birthDate = dates.birthDate(5); // 5 years old
const expiration = dates.expirationDate(12); // 12 months from now
const recent = dates.dateRecent(7); // Within last 7 days

// Time generation
const bidTimes = times.bid(); // ['08:00', '20:00']
const tidTimes = times.tid(); // ['08:00', '14:00', '20:00']
```

### Medical Data

```typescript
import { medications, dosage, conditions } from '@/tests/factories/utils/medical';

// Medication data
const antibiotic = medications.getRandomMedication('antibiotic');
const dose = dosage.calculateDose(25, 15); // 25kg animal, 15mg/kg
const weightInKg = dosage.lbsToKg(55);

// Conditions
const animalConditions = conditions.generateConditions(2);
const allergies = conditions.generateAllergies(1);
```

## Database Integration

### With Test Database

```typescript
import { testDb } from '@/tests/helpers/db-utils';
import { createUser, createHousehold } from '@/tests/factories';
import { users, households } from '@/db/schema';

// Create and insert test data
const user = createUser({ email: 'test@example.com' });
const household = createHousehold({ name: 'Test Family' });

const insertedUser = await testDb.insert(users).values(user).returning();
const insertedHousehold = await testDb.insert(households)
  .values({ ...household, ownerId: insertedUser[0].id })
  .returning();
```

### With Existing Test Helpers

```typescript
import { seedTestData } from '@/tests/helpers/db-utils';
import { TestScenarioBuilder } from '@/tests/factories';

// Use with existing seed functions
const baseData = await seedTestData();

// Or create complete scenarios
const scenario = TestScenarioBuilder.create()
  .withUsers(1, 'completed')
  .withHouseholds(1, 'family')
  .build();

// Insert scenario data
for (const user of scenario.users) {
  await testDb.insert(users).values(user);
}
```

## Testing Integration

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createUser } from '@/tests/factories';

describe('User Factory', () => {
  it('creates a valid user', () => {
    const user = createUser();
    
    expect(user.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeDefined();
  });
  
  it('applies overrides correctly', () => {
    const user = createUser({ 
      email: 'test@example.com',
      firstName: 'John' 
    });
    
    expect(user.email).toBe('test@example.com');
    expect(user.firstName).toBe('John');
  });
});
```

### Integration Tests

```typescript
import { describe, it, beforeEach } from 'vitest';
import { testDb, cleanDatabase } from '@/tests/helpers/db-utils';
import { complexScenarios } from '@/tests/factories';

describe('Medication Management Flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });
  
  it('handles complete medication workflow', async () => {
    const scenario = complexScenarios.medicationManagement();
    
    // Insert test data
    for (const user of scenario.users) {
      await testDb.insert(users).values(user);
    }
    
    // Test the workflow
    // ... test implementation
  });
});
```

### Performance Considerations

- **Seed Consistency**: Use `setSeed(123)` for reproducible random data
- **Batch Generation**: Use scenario builders for multiple related entities
- **Memory Efficiency**: Factories generate data on-demand, not pre-stored
- **Fast Generation**: Optimized for <100ms generation time for complex scenarios

## Best Practices

### Factory Design
- Use builder patterns for complex entities
- Provide sensible defaults with override capability
- Include realistic data distributions
- Support both minimal and full entity creation

### Test Data Management
- Use presets for common scenarios
- Generate fresh data for each test when possible
- Clean up test data between tests
- Use consistent IDs for related entities

### Maintenance
- Update factories when schema changes
- Add new presets for common test patterns
- Keep random data realistic and diverse
- Document any special requirements

## API Reference

### Core Factories
- `createUser(overrides?)` - User entity factory
- `createHousehold(overrides?)` - Household entity factory  
- `createAnimal(overrides?)` - Animal entity factory
- `createMedication(overrides?)` - Medication catalog factory
- `createRegimen(overrides?)` - Regimen entity factory
- `createAdministration(overrides?)` - Administration record factory
- `createInventoryItem(overrides?)` - Inventory item factory
- `createNotification(overrides?)` - Notification factory
- `createAuditLog(overrides?)` - Audit log factory

### Builders
- `UserBuilder` - Fluent user creation
- `HouseholdBuilder` - Household with memberships
- `AnimalBuilder` - Animal with medical history
- `MedicationBuilder` - Medication with dosing info
- `RegimenBuilder` - Regimen with schedules
- `AdministrationBuilder` - Administration records
- `InventoryBuilder` - Inventory management
- `NotificationBuilder` - Notification creation
- `AuditLogBuilder` - Audit trail creation

### Scenarios
- `TestScenarioBuilder` - Complete multi-entity scenarios
- `ComplianceDataBuilder` - Medication adherence patterns
- `quickScenarios.*` - Simple pre-built scenarios
- `complexScenarios.*` - Complex multi-entity scenarios
- `testDataGenerators.*` - Specialized data generators

### Utilities
- `random.*` - Random data generation
- `person.*` - Person-related data
- `animal.*` - Animal-related data
- `medical.*` - Medical data
- `dates.*` - Date and time utilities
- `times.*` - Medication timing utilities