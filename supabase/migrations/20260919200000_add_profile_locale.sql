ALTER TABLE "public"."profiles"
    ADD COLUMN "locale" "text" DEFAULT 'pt' NOT NULL;

ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_locale_check" CHECK (("locale" = ANY (ARRAY['en'::"text", 'pt'::"text"])));
