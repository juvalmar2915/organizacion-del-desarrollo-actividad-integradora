-- migrate:up
ALTER TABLE "public"."users"
    ADD COLUMN "updated_at" TIMESTAMP NULL,
    ADD COLUMN "first_name" varchar(30) NOT NULL,
    ADD COLUMN "last_name" varchar(30) NOT NULL,
    ADD COLUMN "password" varchar(255) NOT NULL,
    ADD COLUMN "enabled" BOOLEAN NOT NULL,
    ADD COLUMN "last_access_time"  TIMESTAMP NULL;

-- migrate:down
ALTER TABLE "public"."users"
    DROP COLUMN "updated_at",
    DROP COLUMN "first_name",
    DROP COLUMN "last_name",
    DROP COLUMN "password",
    DROP COLUMN "enabled",
    DROP COLUMN "last_access_time";