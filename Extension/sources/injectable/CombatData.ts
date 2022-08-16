/*  Melvor Idle Combat Simulator

    Copyright (C) <2020>  <Coolrox95>
    Modified Copyright (C) <2020> <Visua0>
    Modified Copyright (C) <2020, 2021> <G. Miclotte>

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

(() => {

    const reqs = [
        'util',
    ];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * CombatData class, stores all the combat data of a simulation
         */
        MICSR.CombatData = class {
            /**
             *
             */
            constructor(manager) {
                this.manager = manager;
                this.player = this.manager.player;
                this.modifiers = this.player.modifiers;
                // Spell Selection
                this.spells = {
                    standard: SPELLS,
                    curse: CURSES,
                    aurora: AURORAS,
                    ancient: ANCIENT,
                };
                // Combat Stats
                this.combatStats = {
                    attackInterval: 4000,
                    minHit: 0,
                    maxHit: 0,
                    summoningMaxHit: 0,
                    maxAttackRoll: 0,
                    maxDefRoll: 0,
                    maxRngDefRoll: 0,
                    maxMagDefRoll: 0,
                    maxHitpoints: 0,
                    damageReduction: 0,
                    autoEatThreshold: 0,
                    lootBonusPercent: 0,
                    gpBonus: 0,
                };
                // lucky herb bonus
                this.luckyHerb = 0;
                // equipment stats
                this.equipmentStats = this.player.equipmentStats;
                // combat stats
                this.combatStats = {};
                // selected item drop
                this.dropSelected = -1;
            }

            /**
             * Calculates the combat stats from equipment, combat style, spell selection and player levels and stores them in `this.combatStats`
             */
            updateCombatStats() {
                this.player.computeAllStats();

                /*
                First, gather all bonuses TODO: extract this
                 */
                //
                this.computePotionBonus();
                const modifiers = this.player.modifiers;

                /*
                Second, start computing and configuring TODO: extract this
                 */

                // loot doubling
                this.combatStats.lootBonusPercent = MICSR.getModifierValue(modifiers, 'ChanceToDoubleLootCombat')
                    + MICSR.getModifierValue(modifiers, 'ChanceToDoubleItemsGlobal');
                // loot doubling is always between 0% and 100% chance
                this.combatStats.lootBonusPercent = Math.max(0, this.combatStats.lootBonusPercent);
                this.combatStats.lootBonusPercent = Math.min(100, this.combatStats.lootBonusPercent);
                // gp bonus
                this.combatStats.gpBonus = MICSR.averageDoubleMultiplier(
                    MICSR.getModifierValue(modifiers, 'GPFromMonsters')
                    + MICSR.getModifierValue(modifiers, 'GPGlobal')
                    + (this.player.isSlayerTask ? modifiers.summoningSynergy_0_12 : 0)
                );

                // attack speed without aurora
                this.combatStats.attackInterval = this.player.stats.attackInterval;

                // max attack roll
                this.combatStats.maxAttackRoll = this.player.stats.accuracy;

                // max hit roll
                this.combatStats.maxHit = this.player.stats.maxHit;
                this.combatStats.minHit = this.player.stats.minHit;

                // max summ roll
                this.combatStats.summoningMaxHit = this.player.stats.summoningMaxHit;

                // max defence roll
                this.combatStats.maxDefRoll = this.player.stats.evasion.melee;
                this.combatStats.maxRngDefRoll = this.player.stats.evasion.ranged;
                this.combatStats.maxMagDefRoll = this.player.stats.evasion.magic;

                // Calculate damage reduction
                this.combatStats.damageReduction = this.player.stats.damageReduction;

                // Max Hitpoints
                this.combatStats.baseMaxHitpoints = this.player.levels.Hitpoints;
                this.combatStats.baseMaxHitpoints += MICSR.getModifierValue(modifiers, 'MaxHitpoints');
                this.combatStats.maxHitpoints = this.player.stats.maxHitpoints

                // Calculate auto eat threshold
                this.combatStats.autoEatThreshold = this.player.autoEatThreshold;
            }

            /**
             * Computes the potion bonuses for the selected potion
             * */
            computePotionBonus() {
                this.luckyHerb = 0;
                if (this.player.potionSelected) {
                    const potion = items[Herblore.potions[this.player.potionID].potionIDs[this.player.potionTier]];
                    if (potion.potionBonusID === 11) {
                        this.luckyHerb = potion.potionBonus;
                    }
                }
            }

            playerAttackSpeed() {
                let attackSpeed = this.combatStats.attackSpeed;
                attackSpeed -= this.decreasedAttackSpeed();
                return attackSpeed;
            }

            getSummoningXP() {
                const summ1 = this.player.equipmentID(equipmentSlotData.Summon1.id);
                const summ2 = this.player.equipmentID(equipmentSlotData.Summon2.id);
                let xp = 0;
                if (summ1 >= 0 && items[summ1].summoningMaxHit) {
                    xp += getBaseSummoningXP(items[summ1].summoningID, true, 3000);
                }
                if (summ2 >= 0 && items[summ2].summoningMaxHit) {
                    xp += getBaseSummoningXP(items[summ2].summoningID, true, 3000);
                }
                return xp;
            }
        }
    }

    let loadCounter = 0;
    const waitLoadOrder = (reqs, setup, id) => {
        if (typeof characterSelected === typeof undefined) {
            return;
        }
        if (characterSelected && !characterLoading) {
            loadCounter++;
        }
        if (loadCounter > 100) {
            console.log('Failed to load ' + id);
            return;
        }
        // check requirements
        let reqMet = characterSelected && !characterLoading;
        if (window.MICSR === undefined) {
            reqMet = false;
            console.log(id + ' is waiting for the MICSR object');
        } else {
            for (const req of reqs) {
                if (window.MICSR.loadedFiles[req]) {
                    continue;
                }
                reqMet = false;
                // not defined yet: try again later
                if (loadCounter === 1) {
                    window.MICSR.log(id + ' is waiting for ' + req);
                }
            }
        }
        if (!reqMet) {
            setTimeout(() => waitLoadOrder(reqs, setup, id), 50);
            return;
        }
        // requirements met
        window.MICSR.log('setting up ' + id);
        setup();
        // mark as loaded
        window.MICSR.loadedFiles[id] = true;
    }
    waitLoadOrder(reqs, setup, 'CombatData');

})();