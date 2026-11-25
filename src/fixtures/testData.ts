import { toItem } from '@/lib/items';
import type { Item, RawItem } from '@/lib/types';

export const rawItems: RawItem[] = [
  {
    uniqueName: '/Lotus/Powersuits/Excalibur/Excalibur',
    name: 'Excalibur',
    category: 'Warframes',
    type: 'Warframe',
    masterable: true,
    masteryReq: 0,
    imageName: 'excalibur.png',
  },
  {
    uniqueName: '/Lotus/Powersuits/EntratiMech/NechroTech',
    name: 'Voidrig',
    category: 'Warframes',
    type: 'Necramech',
    masterable: true,
    masteryReq: 0,
    imageName: 'voidrig.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Grineer/KuvaLich/Rifles/Bramma/KuvaBramma',
    name: 'Kuva Bramma',
    category: 'Primary',
    type: 'Rifle',
    masterable: true,
    masteryReq: 15,
    imageName: 'kuva-bramma.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Tenno/Melee/Swords/Paracesis/Paracesis',
    name: 'Paracesis',
    category: 'Melee',
    type: 'Rifle',
    masterable: true,
    masteryReq: 10,
    imageName: 'paracesis.png',
  },
  {
    uniqueName: '/Lotus/Types/Sentinels/SentinelPowersuits/CarrierPowerSuit',
    name: 'Carrier',
    category: 'Sentinels',
    type: 'Sentinel',
    masterable: true,
    masteryReq: 0,
    imageName: 'carrier.png',
  },
  {
    uniqueName: '/Lotus/Types/Sentinels/SentinelWeapons/SentGun',
    name: 'Sweeper',
    category: 'Primary',
    type: 'Companion Weapon',
    masterable: true,
    masteryReq: 0,
    imageName: 'sweeper.png',
  },
  {
    uniqueName: '/Lotus/Powersuits/Archwing/StandardJetPack/StandardJetPack',
    name: 'Odonata',
    category: 'Archwing',
    type: 'Archwing',
    masterable: true,
    masteryReq: 0,
    imageName: 'odonata.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Grineer/Archwing/KuvaAyanga',
    name: 'Kuva Ayanga',
    category: 'Arch-Gun',
    type: 'Arch-Gun',
    masterable: true,
    masteryReq: 13,
    imageName: 'kuva-ayanga.png',
  },
  {
    uniqueName: '/Lotus/Types/Vehicles/Hoverboard/HoverboardParts/PartComponents/BadBabyDeck',
    name: 'Bad Baby',
    category: 'Misc',
    type: 'K-Drive Component',
    masterable: true,
    masteryReq: 0,
    imageName: 'bad-baby.png',
  },
  {
    uniqueName: '/Lotus/Weapons/SolarisUnited/Secondary/SUModularSecondarySet1/Barrel/SUModularSecondaryBarrelAPart',
    name: 'Catchmoon',
    category: 'Misc',
    type: 'Kitgun Component',
    masterable: true,
    masteryReq: 0,
    imageName: 'catchmoon.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Ostron/Melee/ModularMelee01/Blade/BladeOne',
    name: 'Balla',
    category: 'Melee',
    type: 'Zaw Component',
    masterable: true,
    masteryReq: 0,
    imageName: 'balla.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Tenno/Pistol/Lato',
    name: 'Lato',
    category: 'Secondary',
    type: 'Pistol',
    masterable: true,
    masteryReq: 0,
    imageName: 'lato.png',
  },
  {
    uniqueName: '/Lotus/Powersuits/Ash/AshPrime',
    name: 'Ash Prime',
    category: 'Warframes',
    type: 'Warframe',
    masterable: true,
    masteryReq: 0,
    imageName: 'ash-prime.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Tenno/Rifle/Braton',
    name: 'Braton',
    category: 'Primary',
    type: 'Rifle',
    masterable: true,
    masteryReq: 0,
    imageName: 'braton.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Tenno/Melee/Swords/Skana',
    name: 'Skana',
    category: 'Melee',
    type: 'Melee',
    masterable: true,
    masteryReq: 0,
    imageName: 'skana.png',
  },
  {
    uniqueName: '/Lotus/Types/Sentinels/SentinelPowersuits/TaxonPowerSuit',
    name: 'Taxon',
    category: 'Sentinels',
    type: 'Sentinel',
    masterable: true,
    masteryReq: 0,
    imageName: 'taxon.png',
  },
  {
    uniqueName: '/Lotus/Weapons/Tenno/Rifle/NotMasterable',
    name: 'Not Masterable',
    category: 'Primary',
    type: 'Rifle',
    masterable: false,
    masteryReq: 0,
    imageName: 'not-masterable.png',
  },
];

export const testItems: Item[] = rawItems
  .filter((item) => item.masterable)
  .map(toItem)
  .sort((a, b) => a.name.localeCompare(b.name));

export function itemByName(name: string): Item {
  const item = testItems.find((candidate) => candidate.name === name);
  if (!item) throw new Error(`Missing test item: ${name}`);
  return item;
}

export const validProfileResponse = {
  Results: [
    {
      AccountId: { $oid: '0123456789abcdef01234567' },
      DisplayName: 'TestTenno',
      PlayerLevel: 12,
      PlayerSkills: {
        LPS_DRIFT_RIDING: 2,
        LPP_DRIFTER: 12000,
      },
      Missions: [
        { Tag: 'SolNode63', Completes: 1 },
        { Tag: 'EarthToVenusJunction', Completes: 1 },
        { Tag: 'SolNode27', Completes: 0 },
      ],
      LoadOutInventory: {
        XPInfo: [
          { ItemType: '/Lotus/Powersuits/Excalibur/Excalibur', XP: 900_000 },
          { ItemType: '/Lotus/Powersuits/EntratiMech/NechroTech', XP: 1_200_000 },
          { ItemType: '/Lotus/Weapons/Grineer/KuvaLich/Rifles/Bramma/KuvaBramma', XP: 600_000 },
          { ItemType: '/Lotus/Weapons/Tenno/Pistol/Lato', XP: 225_000 },
        ],
      },
    },
  ],
};

export const directProfile = {
  DisplayName: 'DirectTenno',
  PlayerLevel: 8,
  LoadOutInventory: {
    XPInfo: [{ ItemType: '/Lotus/Weapons/Tenno/Rifle/Braton', XP: 450_000 }],
  },
};

export const nestedProfile = {
  Results: [
    {
      DisplayName: 'NestedTenno',
      PlayerLevel: 5,
      SomeContainer: {
        Deeper: {
          XPInfo: [{ ItemType: '/Lotus/Weapons/Tenno/Melee/Swords/Skana', XP: 123_456 }],
        },
      },
    },
  ],
};

export const missingXPInfoProfile = {
  Results: [
    {
      DisplayName: 'NoXp',
      PlayerLevel: 3,
      LoadOutInventory: {},
    },
  ],
};

export const emptyResultsProfile = { Results: [] };
