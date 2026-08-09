const TRAIT_ICON_FILE: Record<string, string> = {
  ActOfFaith: "ui_icon_trait_act_of_faith_01.png",
  Ambush: "ui_icon_trait_ambush_01.png",
  BeastSlayer: "ui_icon_trait_beast_slayer_01.png",
  BigTarget: "ui_icon_trait_big_target_01.png",
  BlessingsOfKhorne: "ui_icon_trait_blessing_of_khorne_01.png",
  Camouflage: "ui_icon_trait_camouflage_01.png",
  ContagionsOfNurgle: "ui_icon_trait_contagions_01.png",
  CrushingStrike: "ui_icon_trait_crushing_strike_01.png",
  Daemon: "ui_icon_trait_daemonic_01.png",
  Explodes: "ui_icon_trait_explodes_01.png",
  FinalJustice: "ui_icon_trait_only_in_death_01.png",
  Flying: "ui_icon_trait_flying_01.png",
  GetStuckIn: "ui_icon_trait_beast_snagga_01.png",
  Healer: "ui_icon_trait_healer_01.png",
  HeavyWeapon: "ui_icon_trait_heavy_weapon_01.png",
  IndirectFire: "ui_icon_trait_indirect_fire_01.png",
  Infiltrate: "ui_icon_trait_infiltrate_01.png",
  LetTheGalaxyBurn: "ui_icon_trait_let_the_galaxy_burn_01.png",
  LivingMetal: "ui_icon_trait_livingmetall_01.png",
  MartialKatah: "ui_icon_trait_martial_katah_01.png",
  Mechanic: "ui_icon_trait_mechanic_01.png",
  Mechanical: "ui_icon_trait_mechanical_01.png",
  MkXGravis: "ui_icon_trait_mk_gravis_01.png",
  Overwatch: "ui_icon_trait_overwatch_01.png",
  Parry: "ui_icon_trait_parry_01.png",
  PrioritisedEfficiency: "ui_icon_trait_prioritised_efficiency_01.png",
  Psyker: "ui_icon_trait_psychic_01.png",
  PutridExplosion: "ui_icon_trait_putrid_explosion_01.png",
  RangedSpecialist: "ui_icon_trait_ranged_specialist_01.png",
  RapidAssault: "ui_icon_trait_rapid_assault_01.png",
  Resilient: "ui_icon_trait_resilient_01.png",
  ShadowInTheWarp: "ui_icon_trait_shadow_in_the_warp_01.png",
  SuppressiveFire: "ui_icon_trait_supressive_fire_01.png",
  Synapse: "ui_icon_trait_synapse_01.png",
  TeleportStrike: "ui_icon_trait_teleport_strike_01.png",
  TerminatorArmour: "ui_icon_trait_terminator_amour_01.png",
  Terrifying: "ui_icon_trait_terrifying_01.png",
  ThrillSeekers: "ui_icon_trait_thrill_seekers_01.png",
  Unstoppable: "ui_icon_trait_unstoppable_01.png",
  Vehicle: "ui_icon_trait_vehicle_01.png",
  WeaverOfFate: "ui_icon_trait_weavers_of_fate_01.png",
};

export function traitIconUrl(trait: string): string | undefined {
  const file = TRAIT_ICON_FILE[trait];
  if (!file) {
    return undefined;
  }
  return new URL(`../assets/traits/${file}`, import.meta.url).href;
}
