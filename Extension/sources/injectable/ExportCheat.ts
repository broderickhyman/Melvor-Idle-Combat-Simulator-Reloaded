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
        const MICSR = (window as any).MICSR;
        /**
         * Class to handle exporting to the game, this cheats the current character in a destructive irreversible manner!
         */
        MICSR.ExportCheat = class extends MICSR.Import {
            actualApp: any;
            app: any;
            autoEatTiers: any;
            document: any;
            importSettings: any;
            player: any;

            constructor(app: any) {
                super(app);
                this.actualApp = app;
                // @ts-expect-error TS(2663): Cannot find name 'player'. Did you mean the instan... Remove this comment to see the full error message
                this.player = player;
                this.document = {
                    getElementById: () => {
                        return {};
                    }
                };
                this.app = {
                    setEquipmentImage: () => {
                    },
                    equipItem: (slotID: any, itemID: any) => {
                        // @ts-expect-error TS(2304): Cannot find name 'EquipmentSlots'.
                        const qty = [EquipmentSlots.Quiver, EquipmentSlots.Summon1, EquipmentSlots.Summon2].includes(slotID) ? 1e9 : 1;
                        // @ts-expect-error TS(2304): Cannot find name 'addItemToBank'.
                        addItemToBank(itemID, qty, true, false, true);
                        // @ts-expect-error TS(2304): Cannot find name 'EquipmentSlots'.
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
                    notify: (...args: any[]) => this.actualApp.notify(...args),
                };
            }

            cheat() {
                // add some bank space
                // @ts-expect-error TS(2304): Cannot find name 'addShopPurchase'.
                addShopPurchase('General', 0, 1e3);
                this.player.computeAllStats();
                // add some runes, in case we need them
                // @ts-expect-error TS(2304): Cannot find name 'items'.
                items.filter((x: any) => x.type === 'Rune').forEach((x: any) => addItemToBank(x.id, 1e9, true, false, true));
                // set levels and completion to 100%
                // @ts-expect-error TS(2304): Cannot find name 'skillLevel'.
                skillLevel.fill(99)
                // @ts-expect-error TS(2304): Cannot find name 'completionStats'.
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

            importLevels(levels: any) {
                // @ts-expect-error TS(2304): Cannot find name 'skillLevel'.
                skillLevel = [...levels];
            }

            importSpells(spellSelection: any) {
                this.player.spellSelection = spellSelection;
            }

            importPotion(potionID: any, potionTier: any) {
                // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                if (Herblore.potions[potionID] === undefined) {
                    // @ts-expect-error TS(2304): Cannot find name 'herbloreBonuses'.
                    herbloreBonuses[13] = {
                        bonus: [null, null],
                        charges: 0,
                        itemID: 0,
                    };
                    return;
                }
                // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                const id = (Herblore.potions[potionID].potionIDs[potionTier]);
                // @ts-expect-error TS(2304): Cannot find name 'addItemToBank'.
                addItemToBank(id, 1000000, true, false, true)
                // @ts-expect-error TS(2304): Cannot find name 'usePotion'.
                usePotion(id, false, true);
            }

            importPets(petUnlocked: any) {
                (window as any).petUnlocked = petUnlocked;
            }

            importAutoEat(autoEatTier: any, foodSelected: any, cookingPool: any, cookingMastery: any) {
                // clear AE purchases
                // @ts-expect-error TS(2304): Cannot find name 'shopItemsPurchased'.
                this.autoEatTiers.forEach((aet: any) => shopItemsPurchased.delete(`General:${aet}`));
                // add AE purchases
                for (let i = 0; i < autoEatTier; i++) {
                    // @ts-expect-error TS(2304): Cannot find name 'addShopPurchase'.
                    addShopPurchase('General', this.autoEatTiers[i]);
                }
                // equip food
                this.player.food.selectedIndex = 0;
                this.player.food.unequipSelected();
                // @ts-expect-error TS(2304): Cannot find name 'items'.
                if (items[foodSelected] !== undefined) {
                    // @ts-expect-error TS(2304): Cannot find name 'addItemToBank'.
                    addItemToBank(foodSelected, 1e9);
                    this.player.equipFood(foodSelected, 1e9);
                }
                // set cooking pool
                // @ts-expect-error TS(2304): Cannot find name 'MASTERY'.
                MASTERY[Skills.Cooking].pool = cookingPool * 95 * getMasteryPoolTotalXP(Skills.Cooking) / 100 + 1;
                // set cooking mastery
                // @ts-expect-error TS(2304): Cannot find name 'MASTERY'.
                MASTERY[Skills.Cooking].xp.fill(cookingMastery * 14e6)
            }

            importManualEating(isManualEating: any) {
                // TODO?
            }

            importHealAfterDeath(healAfterDeath: any) {
                // TODO?
            }

            importSlayerTask(isSlayerTask: any) {
                if (isSlayerTask && !MICSR.melvorCombatSim.barSelected || !this.actualApp.barIsMonster(this.actualApp.selectedBar)) {
                    this.actualApp.notify('No monster selected, not setting slayer task !', 'danger');
                    isSlayerTask = false;
                }
                // set slayer task to currently selected monster
                MICSR.actualGame.combatManager.slayerTask.active = isSlayerTask;
                if (isSlayerTask) {
                    MICSR.actualGame.combatManager.slayerTask.monster = MICSR.monsters.getObjectByID(this.actualApp.barMonsterIDs[this.actualApp.selectedBar]);
                }
                MICSR.actualGame.combatManager.slayerTask.killsLeft = isSlayerTask * 1e9;
            }

            importGameMode(currentGamemode: any) {
                if ((window as any).currentGamemode !== currentGamemode) {
                    this.actualApp.notify('Game mode changed, SAVE AND RELOAD !', 'danger');
                    (window as any).currentGamemode = currentGamemode;
                }
            }

            importSummoningSynergy(summoningSynergy: any) {
                // @ts-expect-error TS(2304): Cannot find name 'summoningData'.
                summoningData.MarksDiscovered[this.player.equipment.slots.Summon1.item.summoningID] = 3 * summoningSynergy;
                // @ts-expect-error TS(2304): Cannot find name 'summoningData'.
                summoningData.MarksDiscovered[this.player.equipment.slots.Summon2.item.summoningID] = 3 * summoningSynergy;
            }

            importUseCombinationRunes(useCombinationRunes: any) {
                (window as any).useCombinationRunes = useCombinationRunes;
            }

            importAgilityCourse(course: any, masteries: any, pillar: any) {
                // @ts-expect-error TS(2304): Cannot find name 'chosenAgilityObstacles'.
                chosenAgilityObstacles = course;
                // @ts-expect-error TS(2304): Cannot find name 'MASTERY'.
                MASTERY[MICSR.skillIDs.Agility].xp = MASTERY[MICSR.skillIDs.Agility].xp.map((_: any, i: any) => masteries[i] * 14e6);
                // @ts-expect-error TS(2304): Cannot find name 'agilityPassivePillarActive'.
                agilityPassivePillarActive = pillar;
            }

            importAstrology(astrologyModifiers: any) {
                // @ts-expect-error TS(2304): Cannot find name 'activeAstrologyModifiers'.
                activeAstrologyModifiers = astrologyModifiers.map((x: any) => {
                    return Object.getOwnPropertyNames(x).map(m => {
                        return { [m]: x[m] }
                    });
                });
            }

            checkRadio(baseID: any, check: any) {
                // do nothing
            }
        }
    }

    let loadCounter = 0;
    const waitLoadOrder = (reqs: any, setup: any, id: any) => {
        // @ts-expect-error TS(2304): Cannot find name 'characterSelected'.
        if (typeof characterSelected === typeof undefined) {
            return;
        }
        // @ts-expect-error TS(2304): Cannot find name 'characterSelected'.
        let reqMet = characterSelected && confirmedLoaded;
        if (reqMet) {
            loadCounter++;
        }
        if (loadCounter > 100) {
            console.log('Failed to load ' + id);
            return;
        }
        // check requirements
        if ((window as any).MICSR === undefined) {
            reqMet = false;
            console.log(id + ' is waiting for the MICSR object');
        } else {
            for (const req of reqs) {
                if ((window as any).MICSR.loadedFiles[req]) {
                    continue;
                }
                reqMet = false;
                // not defined yet: try again later
                if (loadCounter === 1) {
                    (window as any).MICSR.log(id + ' is waiting for ' + req);
                }
            }
        }
        if (!reqMet) {
            setTimeout(() => waitLoadOrder(reqs, setup, id), 50);
            return;
        }
        // requirements met
        (window as any).MICSR.log('setting up ' + id);
        setup();
        // mark as loaded
        (window as any).MICSR.loadedFiles[id] = true;
    }
    waitLoadOrder(reqs, setup, 'Import');

})();