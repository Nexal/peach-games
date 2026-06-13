export interface ClanPrompt {
  clan_name: string;
  prompt: string;
}

export const CLAN_PROMPTS: ClanPrompt[] = [
  {
    clan_name: 'Klan Peruna',
    prompt:
      'Transform this portrait photo into a powerful Slavic thunder god warrior avatar. ' +
      'Apply golden lightning streaks (#FFD700) across the face and background. ' +
      'Add eagle feather motifs and crackling electrical energy. ' +
      'Style: dark fantasy painterly, dramatic lighting with gold highlights, ' +
      'fierce warrior expression, Slavic pagan symbols (thunder marks, Perun axe). ' +
      'Keep the face structure recognizable but enhance with divine features. ' +
      'Background: stormy sky with lightning bolts. ' +
      'Square format, high detail, game avatar style.',
  },
  {
    clan_name: 'Klan Welesa',
    prompt:
      'Transform this portrait photo into a mysterious Slavic serpent mage avatar. ' +
      'Apply purple magical aura (#8A2BE2) with ethereal glow around the face. ' +
      'Add serpent scale texture on skin, snake eyes with vertical pupils. ' +
      'Style: dark mystical painterly, moonlight illumination with purple shadows, ' +
      'cunning sorcerer expression, Slavic pagan symbols (Veles serpent, trident). ' +
      'Keep the face structure recognizable but enhance with magical features. ' +
      'Background: deep forest at night, glowing runes floating. ' +
      'Square format, high detail, game avatar style.',
  },
  {
    clan_name: 'Klan Mokoszy',
    prompt:
      'Transform this portrait photo into a serene Slavic water and earth goddess avatar. ' +
      'Apply green nature hues (#2E8B57) with flowing water patterns across the face. ' +
      'Add vine and leaf motifs woven into hair, dew drops on skin. ' +
      'Style: ethereal nature painterly, soft daylight through forest canopy, ' +
      'gentle nurturing expression, Slavic pagan symbols (Mokosz spindle, wheat sheaf). ' +
      'Keep the face structure recognizable but enhance with divine features. ' +
      'Background: sacred spring with water lilies and birch trees. ' +
      'Square format, high detail, game avatar style.',
  },
];

export function getClanPrompt(klanName: string): string | null {
  const entry = CLAN_PROMPTS.find(
    (c) => c.clan_name.toLowerCase() === klanName.toLowerCase()
  );
  return entry?.prompt || null;
}
