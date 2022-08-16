/*  Melvor Idle Combat Simulator

    Copyright (C) <2020> <Visua0>
    Modified Copyright (C) <2020> <G. Miclotte>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * Stats of the player
 * @typedef {Object} PlayerStats
 * @property {number} attackSpeed Attack speed in ms
 * @property {number} attackType Attack Type Melee:0, Ranged:1, Magic:2
 * @property {number} maxAttackRoll Accuracy Rating
 * @property {number} maxHit Maximum Hit of Normal Attack
 * @property {number} minHit Minimum Hit of Normal Attack, for standard spells only
 * @property {number} maxDefRoll Melee Evasion Rating
 * @property {number} maxMagDefRoll Magic Evasion Rating
 * @property {number} maxRngDefRoll Ranged Evasion Rating
 * @property {number} xpBonus Fractional bonus to combat xp gain
 * @property {number} maxHitpoints Maximum hitpoints
 * @property {number} avgHPRegen Average HP gained per regen interval
 * @property {number} damageReduction Damage Reduction in %
 * @property {boolean} diamondLuck If player has diamond luck potion active
 * @property {boolean} usingMagic If the player is using magic
 * @property {boolean} usingAncient If player is using ancient magick
 * @property {boolean} hasSpecialAttack If player can special attack
 * @property {Object} specialData Data of player special attack
 * @property {number} startingGP Initial GP of player
 * @property {Levels} levels Levels of player
 * @property {boolean[]} prayerSelected Prayers of PRAYER that player has active
 * @property {ActiveItems} activeItems Special items the player has active
 * @property {number} prayerPointsPerAttack Prayer points consumed per player attack
 * @property {number} prayerPointsPerEnemy Prayer points consumed per enemy attack
 * @property {number} prayerPointsPerHeal Prayer points consumed per regen interval
 * @property {number} prayerXpPerDamage Prayer xp gained per point of damage dealt
 * @property {boolean} isProtected Player has active protection prayer
 * @property {boolean} hardcore If player is in hardcore mode
 * @property {number} lifesteal Lifesteal from auroras
 * @property {number} decreasedAttackSpeed Decreased attack interval from auroras or gear
 * @property {boolean} canCurse If the player can apply a curse
 * @property {number} curseID The index of the selected curse in CURSES
 * @property {Spell & Curse} curseData The element of the selected curse from CURSES
 * @property {number} globalXPMult Global XP multiplier from FM cape and pet
 * @property {RuneCosts} runeCosts The amount of runes it costs to use the selected spell, curse and aurora
 * @property {number} runePreservation The chance to not use runes
 */

/**
 * @typedef {Object} Levels
 * @property {number} Attack
 * @property {number} Strength
 * @property {number} Defence
 * @property {number} Hitpoints
 * @property {number} Ranged
 * @property {number} Magic
 * @property {number} Prayer
 * @property {number} Slayer
 */

/**
 * @typedef {Object} ActiveItems
 * @property {boolean} hitpointsSkillcape
 * @property {boolean} rangedSkillcape
 * @property {boolean} magicSkillcape
 * @property {boolean} prayerSkillcape
 * @property {boolean} slayerSkillcape
 * @property {boolean} firemakingSkillcape
 * @property {boolean} capeOfArrowPreservation
 * @property {boolean} skullCape
 * @property {boolean} goldRubyRing
 * @property {boolean} goldDiamondRing
 * @property {boolean} goldEmeraldRing
 * @property {boolean} goldSapphireRing
 * @property {boolean} fighterAmulet
 * @property {boolean} warlockAmulet
 * @property {boolean} guardianAmulet
 * @property {boolean} deadeyeAmulet
 * @property {boolean} confettiCrossbow
 * @property {boolean} stormsnap
 * @property {boolean} slayerCrossbow
 * @property {boolean} bigRon
 * @property {boolean} mirrorShield
 * @property {boolean} magicalRing
 */

/**
 * @typedef {Object} RuneCosts
 * @property {number} spell
 * @property {number} curse
 * @property {number} aurora
 */

/**
 * Equipment's combined stats
 * @typedef {Object} EquipmentStats
 * @property {number} attackSpeed
 * @property {number} strengthBonus
 * @property {[number, number, number]} attackBonus
 * @property {number} rangedAttackBonus
 * @property {number} rangedStrengthBonus
 * @property {number} magicAttackBonus
 * @property {number} magicDamageBonus
 * @property {number} defenceBonus
 * @property {number} damageReduction
 * @property {number} rangedDefenceBonus
 * @property {number} magicDefenceBonus
 * @property {number} attackLevelRequired
 * @property {number} defenceLevelRequired
 * @property {number} rangedLevelRequired
 * @property {number} magicLevelRequired
 * @property {number} slayerXPBonus
 * @property {number} chanceToDoubleLoot
 * @property {number} maxHitpointsBonus
 * @property {[number, number, number, number]} increasedMinSpellDmg
 * @property {{id: number, qty: number}} runesProvidedByWeapon The runes for which the weapon reduces spells costs
 * @property {{id: number, qty: number}} runesProvidedByShield The runes for which the shield reduces spells costs
 * @property {ActiveItems} activeItems
 */

/** @typedef {Object} EnemyStats
 * @property {number} hitpoints Max Enemy HP
 * @property {number} attackSpeed Enemy attack speed (ms)
 * @property {number} attackType Enemy attack type
 * @property {number} maxAttackRoll Accuracy Rating
 * @property {number} maxHit Normal attack max hit
 * @property {number} maxDefRoll Melee Evasion Rating
 * @property {number} maxMagDefRoll Magic Evasion Rating
 * @property {number} maxRngDefRoll Ranged Evasion Rating
 * @property {boolean} hasSpecialAttack If enemy can do special attacks
 * @property {number[]} specialAttackChances Chance of each special attack
 * @property {number[]} specialIDs IDs of special attacks
 * @property {number} specialLength Number of special attacks
 */

/** @typedef {Object} Spell A Standard Spell, Aurora, Curse or Ancient Magick
 * @property {string} name The name of the spell
 * @property {string} media The URL of the spell image
 * @property {number} magicLevelRequired The Magic level required to use the spell
 * @property {RuneRequired[]} runesRequired The runes required to cast the spell
 */

/** @typedef {Object} RuneRequired
 * @property {number} id The id of the rune
 * @property {number} qty The quantity required
 */

/** @typedef {Object} StandardSpell Element of SPELLS
 * @property {number} maxHit The base max hit of the spell
 * @property {number} spellType The element of the spell
 */

/** @typedef {Object} Curse Element of CURSES
 * @property {number} chance The % chance for curse to apply
 * @property {string} description A description of the curse
 * @property {number|number[]} effectValue The effect value(s)
 */

/**
 * Simulation result for a single monster
 * @typedef {Object} MonsterSimResult
 * @property {boolean} inQueue
 * @property {boolean} simSuccess
 * @property {number} xpPerEnemy
 * @property {number} xpPerSecond
 * @property {number} xpPerHit
 * @property {number} hpXpPerEnemy
 * @property {number} hpPerEnemy
 * @property {number} hpPerSecond
 * @property {number} dmgPerSecond
 * @property {number} avgKillTime
 * @property {number} attacksMade
 * @property {number} avgHitDmg
 * @property {number} killTimeS
 * @property {number} killsPerSecond
 * @property {number} gpPerKill
 * @property {number} gpPerSecond
 * @property {number} prayerXpPerEnemy
 * @property {number} prayerXpPerSecond
 * @property {number} slayerXpPerSecond
 * @property {number} ppConsumedPerSecond
 * @property {number} herbloreXPPerSecond
 * @property {number} signetChance
 * @property {number} gpFromDamage
 * @property {number} attacksTaken
 * @property {number} attacksTakenPerSecond
 * @property {number} attacksMadePerSecond
 * @property {number} simulationTime
 * @property {number} runesUsedPerSecond
 * @property {PetRolls} petRolls
 */

/** @typedef {Object} PetRolls
 * @property {number[]} Prayer
 * @property {number[]} other
 */

/** @typedef {Object} SimulationWorker
 * @property {Worker} worker
 * @property {boolean} inUse
 */

/** @typedef {Object} SimulationJob
 * @property {number} monsterID
 */
