INSERT OR IGNORE INTO guild_archetypes (code, name, description, perk_json) VALUES
  ('MERCHANT', 'Merchant Guild', 'Masters of trade, receive better market rates and contract payouts.',
   json_object('marketTaxReduction',0.05,'contractBonus',0.1)),
  ('GATHERER', 'Gatherer Guild', 'Experts in resource collection and storage.',
   json_object('productionBoost',0.1,'storageBoost',0.15)),
  ('ADVENTURER', 'Adventurer Guild', 'Raiders and defenders, excel at army missions.',
   json_object('armyPower',0.1,'eventContributionBonus',0.15));

