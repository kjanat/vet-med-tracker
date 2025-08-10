# VetMed Tracker Schema Refactoring Analysis

## Current State Analysis

After reviewing the schema, the current tables are not yet at the scale where partitioning would provide significant benefits. Instead, we should focus on improving table design for better maintainability, performance, and scalability.

## Identified Issues

### 1. Over-Normalized Tables

#### `vetmed_users` - Too Many Responsibilities
**Current Issues:**
- Single table handles user auth, profile, preferences, onboarding
- 35+ columns with mixed concerns
- Complex JSONB fields for extensibility that could be proper tables

**Proposed Split:**
```sql
-- Core user data (authentication & basic info)
vetmed_users (id, email, name, first_name, last_name, stack_user_id, created_at, updated_at)

-- Extended profile information
vetmed_user_profiles (user_id, bio, pronouns, location, website, social_links, profile_visibility, profile_completed_at)

-- User preferences and settings
vetmed_user_preferences (user_id, preferred_timezone, temperature_unit, weight_unit, 
                         use_24_hour_time, email_reminders, sms_reminders, push_notifications,
                         reminder_lead_time_minutes, week_starts_on, theme, default_household_id, default_animal_id)

-- Emergency contacts (separate for security/privacy)
vetmed_emergency_contacts (user_id, contact_name, contact_phone, relationship, created_at)
```

#### `vetmed_animals` - Mixed Medical and Basic Data
**Current Issues:**
- Basic animal info mixed with medical records
- Vet contact info embedded (should be reusable across animals)
- Array fields for allergies/conditions (should be normalized for reporting)

**Proposed Split:**
```sql
-- Core animal information
vetmed_animals (id, household_id, name, species, breed, sex, neutered, dob, weight_kg, 
                microchip_id, color, photo_url, timezone, created_at, updated_at, deleted_at)

-- Medical records and conditions
vetmed_animal_medical_records (id, animal_id, record_type, description, diagnosed_date, 
                               severity, notes, veterinarian_id, created_at, updated_at)

-- Allergies as separate entities for better tracking and reporting
vetmed_animal_allergies (id, animal_id, allergen, severity, reaction_type, 
                         discovered_date, notes, created_at)

-- Veterinarian contacts (reusable across animals and households)
vetmed_veterinarians (id, name, phone, email, clinic_name, specialties, 
                      address, emergency_contact, created_at, updated_at)

-- Link animals to their veterinarians (many-to-many)
vetmed_animal_veterinarians (animal_id, veterinarian_id, is_primary, relationship_type)
```

#### `vetmed_medication_catalog` - Overly Complex Single Table
**Current Issues:**
- Complex JSONB fields for species/breed/age adjustments
- Dosage calculations embedded in catalog (should be dynamic)
- Single table trying to handle all medication complexity

**Proposed Split:**
```sql
-- Core medication catalog (simple, focused)
vetmed_medications (id, generic_name, brand_name, strength, route, form, 
                    controlled_substance, warnings, created_at, updated_at)

-- Dosage guidelines (separate for flexibility)
vetmed_dosage_guidelines (id, medication_id, species, min_dose_mg_kg, max_dose_mg_kg, 
                          typical_dose_mg_kg, max_daily_dose_mg, typical_frequency_hours,
                          max_frequency_per_day, age_min_months, age_max_months, 
                          weight_min_kg, weight_max_kg, notes, created_at)

-- Species-specific adjustments
vetmed_species_adjustments (id, medication_id, species, dose_multiplier, 
                            special_instructions, contraindications, created_at)

-- Breed-specific considerations
vetmed_breed_considerations (id, medication_id, breed, adjustment_type, 
                            dose_multiplier, contraindications, special_notes, created_at)

-- Route-specific modifications
vetmed_route_adjustments (id, medication_id, route, dose_multiplier, 
                          additional_warnings, preparation_notes, created_at)
```

### 2. Notification System Consolidation

**Current Issues:**
- Two separate notification tables with overlapping purposes
- `vetmed_notifications` vs `vetmed_notification_queue`

**Proposed Consolidation:**
```sql
-- Single notification table with status-based workflow
vetmed_notifications (
    id, user_id, household_id, type, title, message, priority,
    -- Status workflow: draft -> scheduled -> sent -> read/dismissed
    status, -- 'draft', 'scheduled', 'sent', 'read', 'dismissed', 'failed'
    
    -- Scheduling fields
    scheduled_for, sent_at, delivered_at,
    
    -- Interaction fields  
    read_at, dismissed_at, snoozed_until,
    
    -- Delivery fields
    delivery_method, -- 'in_app', 'push', 'email', 'sms'
    delivery_data, -- JSONB for method-specific data
    
    -- Error handling
    attempts, last_error, failed_at,
    
    -- Metadata
    action_url, data, created_at, updated_at
)
```

## Recommended Approach

### Phase 1: Schema Normalization (Current Need)
1. Split over-complex tables into focused, atomic tables
2. Normalize array fields into proper relational structures
3. Separate concerns (auth vs profile vs preferences)
4. Create proper foreign key relationships

### Phase 2: Performance Optimization (Future Need)
1. Add appropriate indexes based on query patterns
2. Implement proper database constraints
3. Optimize JSONB usage where it remains necessary

### Phase 3: Partitioning (Future Scale)
1. Monitor table growth after normalization
2. Implement partitioning only when tables reach 10M+ rows
3. Focus on time-series data (administrations, audit logs)

## Benefits of This Approach

### Immediate Benefits
- **Cleaner Data Model**: Each table has a single responsibility
- **Better Performance**: Smaller tables with focused indexes
- **Easier Maintenance**: Changes to one concern don't affect others
- **Improved Queries**: More targeted queries on smaller datasets

### Future Benefits
- **Scalability**: Easier to scale individual concerns
- **Flexibility**: Can add features without modifying core tables
- **Reporting**: Better normalized data for analytics
- **Partitioning Ready**: When needed, partitioning will be more effective on focused tables

## Migration Strategy

### 1. Backwards Compatibility
- Create new tables alongside existing ones
- Use views to maintain existing API compatibility
- Migrate data incrementally

### 2. Application Layer
- Update Drizzle schema gradually
- Implement adapter patterns for complex migrations
- Use feature flags to control rollout

### 3. Testing
- Comprehensive data migration testing
- Performance benchmarking before/after
- API compatibility validation

## Conclusion

**Current Recommendation**: Focus on schema normalization and proper table design rather than partitioning. The current data volumes don't justify the complexity of partitioning, but the schema design could be significantly improved for better performance and maintainability.

**Future Partitioning**: Once normalized tables reach significant scale (10M+ rows), then implement partitioning on the time-series tables (administrations, audit logs, notifications).