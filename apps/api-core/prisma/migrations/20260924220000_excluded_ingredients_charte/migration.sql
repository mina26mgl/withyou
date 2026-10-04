-- Liste d'exclusion de la Charte Beauté Pure : un produit dont la liste INCI
-- contient l'un de ces ingrédients ne peut pas être validé dans la console admin.
INSERT INTO "excluded_ingredient" ("nom") VALUES
  -- Parabènes
  ('Methylparaben'),
  ('Propylparaben'),
  ('Butylparaben'),
  -- Sulfates agressifs
  ('Sodium Lauryl Sulfate'),
  ('Sodium Laureth Sulfate'),
  -- Silicones
  ('Dimethicone'),
  ('Cyclopentasiloxane'),
  -- Libérateurs de formaldéhyde
  ('DMDM Hydantoin'),
  ('Imidazolidinyl Urea'),
  -- Huiles minérales
  ('Paraffinum Liquidum'),
  ('Petrolatum')
ON CONFLICT ("nom") DO NOTHING;
