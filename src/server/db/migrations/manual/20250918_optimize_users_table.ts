import { sql } from "drizzle-orm";
import type { DatabaseExecutor } from "../../ops/utils.ts";

export const id = "20250918_optimize_users_table";

const DEFAULT_PREFERENCES_JSON = `'{"defaultTimezone":"America/New_York","preferredPhoneNumber":null,"emergencyContactName":null,"emergencyContactPhone":null,"notificationPreferences":{"emailReminders":true,"smsReminders":false,"pushNotifications":true,"reminderLeadTime":15},"displayPreferences":{"temperatureUnit":"fahrenheit","weightUnit":"lbs","use24HourTime":false,"weekStartsOn":0,"theme":"system"},"defaultHouseholdId":null,"defaultAnimalId":null,"legacyBackup":null}'`;

const DEFAULT_PROFILE_JSON = `'{"firstName":null,"lastName":null,"bio":null,"pronouns":null,"location":null,"website":null,"socialLinks":{},"profileVisibility":{"name":true,"email":false,"bio":true,"location":true},"profileCompletedAt":null,"legacyProfileData":null}'`;

export async function up(db: DatabaseExecutor): Promise<void> {
  await db.execute(
    sql.raw(`
      ALTER TABLE vetmed_users
        ADD COLUMN preferences jsonb NOT NULL DEFAULT ${DEFAULT_PREFERENCES_JSON}::jsonb,
        ADD COLUMN profile jsonb NOT NULL DEFAULT ${DEFAULT_PROFILE_JSON}::jsonb;
    `),
  );

  await db.execute(
    sql.raw(`
      UPDATE vetmed_users
      SET
        preferences = jsonb_strip_nulls(
          jsonb_build_object(
            'defaultTimezone', COALESCE(preferred_timezone, 'America/New_York'),
            'preferredPhoneNumber', preferred_phone_number,
            'emergencyContactName', emergency_contact_name,
            'emergencyContactPhone', emergency_contact_phone,
            'notificationPreferences', jsonb_build_object(
              'emailReminders', COALESCE(email_reminders, true),
              'smsReminders', COALESCE(sms_reminders, false),
              'pushNotifications', COALESCE(push_notifications, true),
              'reminderLeadTime', COALESCE(NULLIF(reminder_lead_time_minutes, '')::int, 15)
            ),
            'displayPreferences', jsonb_build_object(
              'temperatureUnit', COALESCE(temperature_unit, 'fahrenheit'),
              'weightUnit', COALESCE(weight_unit, 'lbs'),
              'use24HourTime', COALESCE(use_24_hour_time, false),
              'weekStartsOn', COALESCE(week_starts_on, 0),
              'theme', COALESCE(theme, 'system')
            ),
            'defaultHouseholdId', default_household_id,
            'defaultAnimalId', default_animal_id,
            'legacyBackup', NULLIF(preferences_backup::text, '{}')::jsonb
          )
        ),
        profile = jsonb_strip_nulls(
          jsonb_build_object(
            'firstName', first_name,
            'lastName', last_name,
            'bio', bio,
            'pronouns', pronouns,
            'location', location,
            'website', website,
            'socialLinks', COALESCE(social_links, '{}'::jsonb),
            'profileVisibility', COALESCE(
              profile_visibility,
              '{"name": true, "email": false, "bio": true, "location": true}'::jsonb
            ),
            'profileCompletedAt', to_jsonb(profile_completed_at),
            'legacyProfileData', NULLIF(profile_data::text, '{}')::jsonb
          )
        );
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE vetmed_users
        DROP COLUMN preferred_timezone,
        DROP COLUMN preferred_phone_number,
        DROP COLUMN use_24_hour_time,
        DROP COLUMN temperature_unit,
        DROP COLUMN weight_unit,
        DROP COLUMN email_reminders,
        DROP COLUMN sms_reminders,
        DROP COLUMN push_notifications,
        DROP COLUMN reminder_lead_time_minutes,
        DROP COLUMN emergency_contact_name,
        DROP COLUMN emergency_contact_phone,
        DROP COLUMN preferences_backup,
        DROP COLUMN week_starts_on,
        DROP COLUMN theme,
        DROP COLUMN first_name,
        DROP COLUMN last_name,
        DROP COLUMN bio,
        DROP COLUMN pronouns,
        DROP COLUMN location,
        DROP COLUMN website,
        DROP COLUMN social_links,
        DROP COLUMN profile_data,
        DROP COLUMN profile_visibility,
        DROP COLUMN profile_completed_at;
    `),
  );
}

export async function down(db: DatabaseExecutor): Promise<void> {
  await db.execute(
    sql.raw(`
      ALTER TABLE vetmed_users
        ADD COLUMN preferred_timezone text DEFAULT 'America/New_York',
        ADD COLUMN preferred_phone_number text,
        ADD COLUMN use_24_hour_time boolean DEFAULT false,
        ADD COLUMN temperature_unit temperature_unit DEFAULT 'fahrenheit',
        ADD COLUMN weight_unit weight_unit DEFAULT 'lbs',
        ADD COLUMN email_reminders boolean DEFAULT true,
        ADD COLUMN sms_reminders boolean DEFAULT false,
        ADD COLUMN push_notifications boolean DEFAULT true,
        ADD COLUMN reminder_lead_time_minutes text DEFAULT '15',
        ADD COLUMN emergency_contact_name text,
        ADD COLUMN emergency_contact_phone text,
        ADD COLUMN preferences_backup jsonb,
        ADD COLUMN week_starts_on integer DEFAULT 0,
        ADD COLUMN theme text DEFAULT 'system',
        ADD COLUMN first_name text,
        ADD COLUMN last_name text,
        ADD COLUMN bio text,
        ADD COLUMN pronouns text,
        ADD COLUMN location text,
        ADD COLUMN website text,
        ADD COLUMN social_links jsonb DEFAULT '{}'::jsonb,
        ADD COLUMN profile_data jsonb DEFAULT '{}'::jsonb,
        ADD COLUMN profile_visibility jsonb DEFAULT '{"name": true, "email": false, "bio": true, "location": true}'::jsonb,
        ADD COLUMN profile_completed_at timestamptz;
    `),
  );

  await db.execute(
    sql.raw(`
      UPDATE vetmed_users
      SET
        preferred_timezone = COALESCE(preferences->>'defaultTimezone', 'America/New_York'),
        preferred_phone_number = preferences->>'preferredPhoneNumber',
        emergency_contact_name = preferences->>'emergencyContactName',
        emergency_contact_phone = preferences->>'emergencyContactPhone',
        use_24_hour_time = COALESCE((preferences->'displayPreferences'->>'use24HourTime')::boolean, false),
        temperature_unit = COALESCE((preferences->'displayPreferences'->>'temperatureUnit')::temperature_unit, 'fahrenheit'),
        weight_unit = COALESCE((preferences->'displayPreferences'->>'weightUnit')::weight_unit, 'lbs'),
        week_starts_on = COALESCE((preferences->'displayPreferences'->>'weekStartsOn')::int, 0),
        theme = COALESCE(preferences->'displayPreferences'->>'theme', 'system'),
        email_reminders = COALESCE((preferences->'notificationPreferences'->>'emailReminders')::boolean, true),
        sms_reminders = COALESCE((preferences->'notificationPreferences'->>'smsReminders')::boolean, false),
        push_notifications = COALESCE((preferences->'notificationPreferences'->>'pushNotifications')::boolean, true),
        reminder_lead_time_minutes = COALESCE(preferences->'notificationPreferences'->>'reminderLeadTime', '15'),
        preferences_backup = COALESCE(preferences->'legacyBackup', '{}'::jsonb),
        first_name = profile->>'firstName',
        last_name = profile->>'lastName',
        bio = profile->>'bio',
        pronouns = profile->>'pronouns',
        location = profile->>'location',
        website = profile->>'website',
        social_links = COALESCE(profile->'socialLinks', '{}'::jsonb),
        profile_data = COALESCE(profile->'legacyProfileData', '{}'::jsonb),
        profile_visibility = COALESCE(profile->'profileVisibility', '{"name": true, "email": false, "bio": true, "location": true}'::jsonb),
        profile_completed_at =
          CASE
            WHEN profile->>'profileCompletedAt' IS NULL THEN NULL
            ELSE (profile->>'profileCompletedAt')::timestamptz
          END;
    `),
  );

  await db.execute(
    sql.raw(`
      ALTER TABLE vetmed_users
        DROP COLUMN preferences,
        DROP COLUMN profile;
    `),
  );
}
