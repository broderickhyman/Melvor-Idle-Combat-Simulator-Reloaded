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
        'Import',
    ];

    const setup = () => {
        const MICSR = window.MICSR;
        /**
         * Class to handle exporting to the game, this cheats the current character in a destructive irreversible manner!
         */
        MICSR.ExportCheat = class extends MICSR.Import {

            constructor(app) {
                super(app);
                this.actualApp = app;
                this.player = player;
                this.document = {
                    getElementById: () => {
                        return {};
                    }
                };
                this.app = {
                    setEquipmentImage: () => {
                    },
                    equipItem: (slotID, itemID) => {
                        const qty = [EquipmentSlots.Quiver, EquipmentSlots.Summon1, EquipmentSlots.Summon2].includes(slotID) ? 1e9 : 1;
                        addItemToBank(itemID, qty, true, false, true);
                        this.player.equipItem(itemID, 0, EquipmentSlots[slotID], qty)
                    },
                    updateStyleDropdowns: () => {
                    },
                    selectButton: () => {
                    },
                    unselectButton: () => {
                    },
                    getPrayerName: () => {
                    },
                    notify: (...args) => this.actualApp.notify(...args),
                };
            }

            cheat() {
                // add some bank space
                addShopPurchase('General', 0, 1e3);
                this.player.computeAllStats();
                // add some runes, in case we need them
                items.filter(x => x.type === 'Rune').forEach(x => addItemToBank(x.id, 1e9, true, false, true));
                // set levels and completion to 100%
                skillLevel.fill(99)
                completionStats = 100;
                // export settings
                const settings = this.actualApp.import.exportSettings();
                // cheat settings to game
                this.importSettings(settings);
                // update stats
                this.player.computeAllStats();
            }

            update() {
                // do nothing
            }

            importLevels(levels) {
                skillLevel = [...levels];
            }

            importSpells(spellSelection) {
                this.player.spellSelection = spellSelection;
            }

            importPotion(potionID, potionTier) {
                if (Herblore.potions[potionID] === undefined) {
                    herbloreBonuses[13] = {
                        bonus: [null, null],
                        charges: 0,
                        itemID: 0,
                    };
                    return;
                }
                const id = (Herblore.potions[potionID].potionIDs[potionTier]);
                addItemToBank(id, 1000000, true, false, true)
                usePotion(id, false, true);
            }

            importPets(petUnlocked) {
                window.petUnlocked = petUnlocked;
            }

            importAutoEat(autoEatTier, foodSelected, cookingPool, cookingMastery) {
                // clear AE purchases
                this.autoEatTiers.forEach(aet => shopItemsPurchased.delete(`General:${aet}`));
                // add AE purchases
                for (let i = 0; i < autoEatTier; i++) {
                    addShopPurchase('General', this.autoEatTiers[i]);
                }
                // equip food
                this.player.food.selectedIndex = 0;
                this.player.food.unequipSelected();
                if (items[foodSelected] !== undefined) {
                    addItemToBank(foodSelected, 1e9);
                    this.player.equipFood(foodSelected, 1e9);
                }
                // set cooking pool
                MASTERY[Skills.Cooking].pool = cookingPool * 95 * getMasteryPoolTotalXP(Skills.Cooking) / 100 + 1;
                // set cooking mastery
                MASTERY[Skills.Cooking].xp.fill(cookingMastery * 14e6)
            }

            importManualEating(isManualEating) {
                // TODO?
            }

            importHealAfterDeath(healAfterDeath) {
                // TODO?
            }

            importSlayerTask(isSlayerTask) {
                if (isSlayerTask && !MICSR.melvorCombatSim.barSelected || !this.actualApp.barIsMonster(this.actualApp.selectedBar)) {
                    this.actualApp.notify('No monster selected, not setting slayer task !', 'danger');
                    isSlayerTask = false;
                }
                // set slayer task to currently selected monster
                combatManager.slayerTask.active = isSlayerTask;
                if (isSlayerTask) {
                    combatManager.slayerTask.monster = MONSTERS[this.actualApp.barMonsterIDs[this.actualApp.selectedBar]];
                }
                combatManager.slayerTask.killsLeft = isSlayerTask * 1e9;
            }

            importGameMode(currentGamemode) {
                if (window.currentGamemode !== currentGamemode) {
                    this.actualApp.notify('Game mode changed, SAVE AND RELOAD !', 'danger');
                    window.currentGamemode = currentGamemode;
                }
            }

            importSummoningSynergy(summoningSynergy) {
                summoningData.MarksDiscovered[this.player.equipment.slots.Summon1.item.summoningID] = 3 * summoningSynergy;
                summoningData.MarksDiscovered[this.player.equipment.slots.Summon2.item.summoningID] = 3 * summoningSynergy;
            }

            importUseCombinationRunes(useCombinationRunes) {
                window.useCombinationRunes = useCombinationRunes;
            }

            importAgilityCourse(course, masteries, pillar) {
                chosenAgilityObstacles = course;
                MASTERY[Skills.Agility].xp = MASTERY[Skills.Agility].xp.map((_, i) => masteries[i] * 14e6);
                agilityPassivePillarActive = pillar;
            }

            importAstrology(astrologyModifiers) {
                activeAstrologyModifiers = astrologyModifiers.map(x => {
                    return Object.getOwnPropertyNames(x).map(m => {
                        return {[m]: x[m]}
                    });
                });
            }

            checkRadio(baseID, check) {
                // do nothing
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
    waitLoadOrder(reqs, setup, 'Import');

})();