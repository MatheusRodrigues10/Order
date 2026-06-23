-- RemoveInsecurePinDefault
-- Remove o @default("123456") inseguro da coluna apiPin.
-- O código sempre fornece o valor via env.DEFAULT_API_PIN ao criar settings.
ALTER TABLE "settings" ALTER COLUMN "apiPin" DROP DEFAULT;
