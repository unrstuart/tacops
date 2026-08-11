import characterData from "../assets/character-data.json";
import abilityData from "../assets/ability-data.json";

interface AttackProfile {
  pierce: string;
  hitCount: number;
  range?: number;
}

interface CharacterData {
  id: string;
  name: string;
  traits: string[];
  alliance: string;
  faction: string;
  meleeAttack: AttackProfile;
  rangedAttack?: AttackProfile;
  activeAbilityId: string;
  passiveAbilityIds: string;
}

interface AbilityData {
  id: string;
  constants?: Record<string, string>;
}

const characterById = new Map((characterData as CharacterData[]).map((c) => [c.id, c]));
const abilityById = new Map((abilityData as AbilityData[]).map((a) => [a.id, a]));

const DAMAGE_PROFILE_KEYS = ["damageProfile", "damageProfile_2", "damageProfile_3"];

export interface CharacterProfile {
  name: string;
  damageProfiles: string[];
  traits: string[];
  alliance: string;
  faction: string;
  hasRangedAttack: boolean;
}

function addAbilityDamageProfiles(profiles: Set<string>, abilityId: string): void {
  const ability = abilityById.get(abilityId);
  if (!ability) {
    throw new Error(`Unknown ability id: ${abilityId}`);
  }
  for (const key of DAMAGE_PROFILE_KEYS) {
    const profile = ability.constants?.[key];
    if (profile) {
      profiles.add(profile);
    }
  }
}

export function getCharacterProfile(characterId: string): CharacterProfile {
  const character = characterById.get(characterId);
  if (!character) {
    throw new Error(`Unknown character id: ${characterId}`);
  }

  const damageProfiles = new Set<string>();
  damageProfiles.add(character.meleeAttack.pierce);
  if (character.rangedAttack) {
    damageProfiles.add(character.rangedAttack.pierce);
  }
  addAbilityDamageProfiles(damageProfiles, character.activeAbilityId);
  addAbilityDamageProfiles(damageProfiles, character.passiveAbilityIds);

  return {
    name: character.name,
    damageProfiles: [...damageProfiles],
    traits: character.traits,
    alliance: character.alliance,
    faction: character.faction,
    hasRangedAttack: character.rangedAttack !== undefined,
  };
}
