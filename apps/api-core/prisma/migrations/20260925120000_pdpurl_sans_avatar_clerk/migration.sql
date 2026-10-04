-- L'avatar générique de Clerk (URL img.clerk.com dont le jeton commence par
-- {"type":"default", …) n'est pas une photo : on le retire pour afficher la
-- photo withyou par défaut et laisser la cliente choisir la sienne.
UPDATE "user" SET "pdpurl" = NULL WHERE "pdpurl" LIKE 'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIs%';
