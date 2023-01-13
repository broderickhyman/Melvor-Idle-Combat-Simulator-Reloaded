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

// this.micsr.defaultSettings = {
//     // version: this.micsr.version,
//     astrologyModifiers: [],
//     course: Array(10).fill(-1),
//     courseMastery: { "-1": false },
//     equipment: Array(Object.getOwnPropertyNames(equipmentSlotData).length).fill(-1),
//     levels: Array(this.micsr.game.skills.allObjects.length).fill(1),
//     petUnlocked: Array(this.micsr.pets.length).fill(false),
//     styles: {
//         melee: 'Stab',
//         ranged: 'Accurate',
//         magic: 'Magic',
//     },
//     prayerSelected: [],
//     ancient: undefined,
//     archaic: undefined,
//     aurora: undefined,
//     autoEatTier: -1,
//     cookingMastery: false,
//     cookingPool: false,
//     currentGamemode: 0,
//     curse: undefined,
//     foodSelected: undefined,
//     healAfterDeath: true,
//     isAncient: false,
//     isManualEating: false,
//     isSlayerTask: false,
//     pillar: undefined,
//     potionID: undefined,
//     potionTier: 0,
//     standard: 0,
//     summoningSynergy: true,
//     useCombinationRunes: false,
// }
// this.micsr.defaultSettings.levels[this.micsr.skillIDs.Hitpoints] = 10;

/**
 * Class to handle importing
 */
class Import {
    app: App;
    autoEatTiers: any;
    document: any;
    player: SimPlayer;
    micsr: MICSR;

    constructor(app: App) {
        this.app = app;
        this.micsr = app.micsr;
        this.player = app.player;
        this.document = document;
        this.autoEatTiers = [
            this.micsr.game.shop.purchases.getObjectByID('melvorD:Auto_Eat_Tier_I'),
            this.micsr.game.shop.purchases.getObjectByID('melvorD:Auto_Eat_Tier_II'),
            this.micsr.game.shop.purchases.getObjectByID('melvorD:Auto_Eat_Tier_III'),
        ];
    }

    /**
     * Callback for when the import button is clicked
     * @param {number} setID Index of equipmentSets from 0-2 to import
     */
    importButtonOnClick(setID: any) {
        /* TODO
        // get potion
        let potionID = -1;
        let potionTier = -1;
        // @ts-expect-error TS(2304): Cannot find name 'herbloreBonuses'.
        const itemID = herbloreBonuses[13].itemID;
        if (itemID !== 0) {
            // Get tier and potionID
            // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
            for (let i = 0; i < Herblore.potions.length; i++) {
                // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                if (Herblore.potions[i].category === 0) {
                    // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                    for (let j = 0; j < Herblore.potions[i].potionIDs.length; j++) {
                        // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                        if (Herblore.potions[i].potionIDs[j] === itemID) {
                            potionID = i;
                            potionTier = j;
                        }
                    }
                }
            }
        }
         */
        // get foodSelected
        const foodSelected = this.micsr.actualGame.combat.player.food.currentSlot.item;
        // get cooking mastery for foodSelected
        const foodMastery = foodSelected.masteryID;
        // @ts-expect-error TS(2304): Cannot find name 'Skills'.
        const cookingMastery = foodSelected !== 'melvorD:Empty_Food' && foodMastery && foodMastery[0] === Skills.Cooking
            // @ts-expect-error TS(2304): Cannot find name 'exp'.
            && exp.xp_to_level(MASTERY[Skills.Cooking].xp[foodMastery[1]]) > 99;

        // get the player's auto eat tier
        const autoEatTier = -1 + this.autoEatTiers.filter((x: any) => this.micsr.actualGame.shop.upgradesPurchased.get(x)).length;
        /* TODO
        // get the active astrology modifiers
        const astrologyModifiers = [];
        // @ts-expect-error TS(2304): Cannot find name 'Astrology'.
        for (const constellation of Astrology.constellations) {
            const constellationModifiers = this.micsr.game.astrology.constellationModifiers.get(constellation);
            const modifiers = {};
            if (constellationModifiers) {
                for (const m of [...constellationModifiers.standard, ...constellationModifiers.unique]) {
                    if (m.value === undefined) {
                        if (m.values.length === 0) {
                            continue;
                        }
                        const skillID = m.values[0][0];
                        const value = m.values[0][1];
                        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        modifiers[m.key] = modifiers[m.key] ?? [];
                        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        const index = modifiers[m.key].findIndex((x: any) => x[0] === skillID);
                        if (index === -1) {
                            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            modifiers[m.key] = modifiers[m.key] ?? [];
                            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            modifiers[m.key].push([skillID, value]);
                        } else {
                            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            modifiers[m.key][index][1] += value;
                        }
                    } else {
                        if (m.value === 0) {
                            continue;
                        }
                        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        modifiers[m.key] = (modifiers[m.key] ?? 0) + m.value;
                    }
                }
            }
            astrologyModifiers.push(modifiers);
        }
         */

        /* TODO
        // get the chosen agility obstacles
        // @ts-expect-error TS(2304): Cannot find name 'Agility'.
        const chosenAgilityObstacles = Array(1 + Math.max(...Agility.obstacles.map((x: any) => x.category))).fill(-1);
        for (let i = 0; i < chosenAgilityObstacles.length; i++) {
            const obstacle = this.micsr.game.agility.builtObstacles.get(i);
            if (obstacle !== undefined) {
                chosenAgilityObstacles[i] = obstacle.id;
            }
        }
         */
        const equipment = this.micsr.actualGame.combat.player.equipmentSets[setID].equipment;

        // create settings object
        const settings = {
            version: this.micsr.version,
            // lists
            //TODO astrologyModifiers: astrologyModifiers,
            //TODO course: chosenAgilityObstacles,
            courseMastery: this.micsr.actualGame.agility.actions.allObjects.map((action: any) => this.micsr.actualGame.agility.getMasteryLevel(action) >= 99),
            equipment: equipment.slotArray.map((x: any) => x.item.id),
            levels: this.micsr.actualGame.skills.allObjects.map((x: any) => x.level),
            // TODO petUnlocked: petUnlocked,
            // objects
            styles: {
                magic: this.micsr.actualGame.combat.player.attackStyles.melee.id,
                melee: this.micsr.actualGame.combat.player.attackStyles.melee.id,
                ranged: this.micsr.actualGame.combat.player.attackStyles.melee.id,
            },
            // simple values
            ancient: this.micsr.actualGame.combat.player.spellSelection.ancient,
            archaic: this.micsr.actualGame.combat.player.spellSelection.archaic,
            aurora: this.micsr.actualGame.combat.player.spellSelection.aurora,
            autoEatTier: autoEatTier,
            cookingMastery: cookingMastery,
            // TODO cookingPool: getMasteryPoolProgress(Skills.Cooking) >= 95,
            currentGamemode: this.micsr.actualGame.currentGamemode,
            curse: this.micsr.actualGame.combat.player.spellSelection.curse,
            foodSelected: foodSelected,
            healAfterDeath: this.player.healAfterDeath,
            isAncient: this.micsr.actualGame.combat.player.spellSelection.ancient !== undefined,
            isManualEating: this.player.isManualEating,
            isSlayerTask: this.player.isSlayerTask,
            pillar: this.micsr.game.agility.builtPassivePillar === undefined ? -1 : this.micsr.game.agility.builtPassivePillar.id,
            // TODO potionID: potionID,
            // TODO potionTier: potionTier,
            prayerSelected: [...this.micsr.actualGame.combat.player.activePrayers],
            standard: this.micsr.actualGame.combat.player.spellSelection.standard,
            summoningSynergy: this.player.summoningSynergy, // TODO: import mark levels
            useCombinationRunes: this.micsr.actualGame.combat.player.useCombinationRunes,
        };

        // import settings
        this.importSettings(settings);
        // update app and simulator objects
        this.update();
    }

    exportSettings() {
        const courseMastery = {};
        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        this.player.course.forEach((o: any, i: any) => courseMastery[o] = this.player.courseMastery[i]);
        return {
            version: this.micsr.version,
            // lists
            astrologyModifiers: this.player.activeAstrologyModifiers,
            course: [...this.player.course],
            courseMastery: courseMastery,
            equipment: this.player.equipment.slotArray.map((x: any) => x.item.id),
            levels: [...this.player.skillLevel],
            petUnlocked: [...this.player.petUnlocked],
            // objects
            styles: { ...this.player.attackStyles },
            prayerSelected: [...this.player.activePrayers],
            // simple values
            ancient: this.player.spellSelection.ancient,
            archaic: this.player.spellSelection.archaic,
            aurora: this.player.spellSelection.aurora,
            autoEatTier: this.player.autoEatTier,
            cookingMastery: this.player.cookingMastery,
            cookingPool: this.player.cookingPool,
            currentGamemode: this.player.currentGamemode,
            curse: this.player.spellSelection.curse,
            foodSelected: this.player.food.currentSlot.item,
            healAfterDeath: this.player.healAfterDeath,
            isAncient: this.player.spellSelection.ancient > -1,
            isManualEating: this.player.isManualEating,
            isSlayerTask: this.player.isSlayerTask,
            pillar: this.player.pillar,
            potionID: this.player.potionID,
            potionTier: this.player.potionTier,
            standard: this.player.spellSelection.standard,
            summoningSynergy: this.player.summoningSynergy,
            useCombinationRunes: this.player.useCombinationRunes,
        };
    }

    importSettings(settings: any) {
        if (settings.version !== this.micsr.version) {
            this.micsr.warn(`Importing MICSR ${settings.version} settings in MICSR ${this.micsr.version}.`)
        }
        // validate
        for (const prop in this.micsr.defaultSettings) {
            if (settings[prop] === undefined) {
                this.micsr.log(`No valid ${prop} data imported, using default ${this.micsr.defaultSettings[prop]}.`)
                settings[prop] = this.micsr.defaultSettings[prop];
            }
        }
        // import settings
        this.importEquipment(settings.equipment);
        this.importLevels(settings.levels);
        this.importStyle(settings.styles);
        this.importSpells({
            ancient: settings.ancient,
            archaic: settings.archaic,
            aurora: settings.aurora,
            curse: settings.curse,
            standard: settings.standard,
        });
        this.importPrayers(settings.prayerSelected);
        // TODO this.importPotion(settings.potionID, settings.potionTier);
        // TODO this.importPets(settings.petUnlocked);
        this.importAutoEat(settings.autoEatTier, settings.foodSelected, settings.cookingPool, settings.cookingMastery);
        this.importManualEating(settings.isManualEating);
        this.importHealAfterDeath(settings.healAfterDeath);
        this.importSlayerTask(settings.isSlayerTask);
        this.importGameMode(settings.currentGamemode);
        this.importUseCombinationRunes(settings.useCombinationRunes);
        // TODO this.importAgilityCourse(settings.course, settings.courseMastery, settings.pillar);
        this.importSummoningSynergy(settings.summoningSynergy);
        // TODO this.importAstrology(settings.astrologyModifiers);
        // notify completion
        this.app.notify('Import completed.');
    }

    update() {
        // update and compute values
        this.app.updateSpellOptions();
        this.app.updatePrayerOptions();
        this.app.updateCombatStats();
    }

    importEquipment(equipment: any) {
        // clear previous items
        this.player.equipment.unequipAll();
        for (const slot in this.micsr.equipmentSlotData) {
            const slotID = this.micsr.equipmentSlotData[slot].id;
            this.app.setEquipmentImage(slotID);
        }
        // load new items
        for (const slot in this.micsr.equipmentSlotData) {
            const slotID = this.micsr.equipmentSlotData[slot].id;
            const itemID = equipment[slotID];
            if (itemID === 'melvorD:Empty_Equipment') {
                continue;
            }
            this.app.equipItem(slotID, this.micsr.items.getObjectByID(itemID));
        }
        // update style drop down
        this.app.updateStyleDropdowns();
    }

    importLevels(levels: any) {
        this.app.skillKeys.forEach((key: any) => {
            this.document.getElementById(`MCS ${key} Input`).value = levels[this.micsr.skillIDs[key]];
        });
        this.player.skillLevel = [...levels];
    }

    importStyle(styles: any) {
        [
            'melee',
            'ranged',
            'magic',
        ].forEach(cbStyle => {
            const attackStyle = this.micsr.actualGame.attackStyles.getObjectByID(styles[cbStyle]);
            const index = this.micsr.attackStylesIdx[cbStyle];
            this.player.setAttackStyle(cbStyle, attackStyle);
            this.document.getElementById(`MCS ${cbStyle} Style Dropdown`).selectedIndex = index % 3;
        });
    }

    importSpells(spellSelection: any) {
        // Set all active spell UI to be disabled
        Object.keys(this.app.combatData.spells).forEach((spellType) => {
            const spellID = this.player.spellSelection[spellType];
            this.app.disableSpell(spellType, spellID);
            this.app.enableSpell(spellType, spellSelection[spellType]);
        });
        this.app.spellSanityCheck();
    }

    importPrayers(prayerSelected: any) {
        // toggle old prayers off
        this.player.activePrayers.clear();
        // Update prayers
        this.micsr.prayers.forEach((prayer: any) => {
            const prayButton = this.document.getElementById(`MCS ${this.app.getPrayerName(prayer)} Button`);
            if (prayerSelected.includes(prayer.id)) {
                this.app.selectButton(prayButton);
                this.player.activePrayers.add(prayer.id);
            } else {
                this.app.unselectButton(prayButton);
            }
        });
    }

    importPotion(potionID: any, potionTier: any) {
        // Deselect potion if selected
        if (this.player.potionSelected) {
            this.app.unselectButton(this.document.getElementById(`MCS ${this.app.getPotionName(this.player.potionID)} Button`));
            this.player.potionSelected = false;
            this.player.potionID = -1;
        }
        // Select new potion if applicable
        if (potionID !== -1) {
            this.player.potionSelected = true;
            this.player.potionID = potionID;
            this.app.selectButton(this.document.getElementById(`MCS ${this.app.getPotionName(this.player.potionID)} Button`));
        }
        // Set potion tier if applicable
        if (potionTier !== -1) {
            this.player.potionTier = potionTier;
            this.app.updatePotionTier(potionTier);
            // Set dropdown to correct option
            this.document.getElementById('MCS Potion Tier Dropdown').selectedIndex = potionTier;
        }
    }

    importPets(petUnlocked: any) {
        // Import pets
        petUnlocked.forEach((owned: any, petID: any) => {
            this.player.petUnlocked[petID] = owned;
            if (this.app.petIDs.includes(petID)) {
                if (owned) {
                    this.app.selectButton(this.document.getElementById(`MCS ${this.micsr.pets[petID].name} Button`));
                } else {
                    this.app.unselectButton(this.document.getElementById(`MCS ${this.micsr.pets[petID].name} Button`));
                }
            }
            if (petID === 4 && owned) this.document.getElementById('MCS Rock').style.display = '';
        });
    }

    importAutoEat(autoEatTier: any, foodSelected: any, cookingPool: any, cookingMastery: any) {
        // Import Food Settings
        this.player.autoEatTier = autoEatTier;
        this.document.getElementById('MCS Auto Eat Tier Dropdown').selectedIndex = autoEatTier + 1;
        this.app.equipFood(foodSelected);
        /* TODO
        this.checkRadio('MCS 95% Cooking Pool', cookingPool);
        this.player.cookingPool = cookingPool;
        this.checkRadio('MCS 99 Cooking Mastery', cookingMastery);
        this.player.cookingMastery = cookingMastery;
         */
    }

    importManualEating(isManualEating: any) {
        this.checkRadio('MCS Manual Eating', isManualEating);
        this.player.isManualEating = isManualEating;
    }

    importHealAfterDeath(healAfterDeath: any) {
        this.checkRadio('MCS Heal After Death', healAfterDeath);
        this.player.healAfterDeath = healAfterDeath;
    }

    importSlayerTask(isSlayerTask: any) {
        // Update slayer task mode
        this.checkRadio('MCS Slayer Task', isSlayerTask);
        this.player.isSlayerTask = isSlayerTask;
        this.app.slayerTaskSimsToggle();
    }

    importGameMode(gamemode: any) {
        this.player.currentGamemode = gamemode;
        const index = this.micsr.gamemodes.findIndex((x: any) => x.id === gamemode.id);
        this.document.getElementById('MCS Game Mode Dropdown').selectedIndex = index;
    }

    importSummoningSynergy(summoningSynergy: any) {
        // Update summoningSynergy
        this.player.summoningSynergy = summoningSynergy;
    }

    importUseCombinationRunes(useCombinationRunes: any) {
        // Update hardcore mode
        this.checkRadio('MCS Use Combination Runes', useCombinationRunes);
        this.player.useCombinationRunes = useCombinationRunes;
    }

    importAgilityCourse(course: any, masteries: any, pillar: any) {
        this.app.agilityCourse.importAgilityCourse(course, masteries, pillar);
    }

    importAstrology(astrologyModifiers: any) {
        this.player.activeAstrologyModifiers.forEach((constellation: any, idx: any) => {
            for (const modifier in constellation) {
                // import values and set rest to 0
                if (astrologyModifiers[idx] !== undefined && astrologyModifiers[idx][modifier] !== undefined) {
                    constellation[modifier] = astrologyModifiers[idx][modifier];
                    if (constellation[modifier].push) {
                        // filter non combat skill modifiers
                        constellation[modifier] = constellation[modifier].filter((x: any) => this.micsr.showModifiersInstance.relevantModifiers.combat.skillIDs.includes(x[0])
                        );
                    }
                } else if (constellation[modifier].push) {
                    // keep entries per skill, but set value to 0
                    constellation[modifier] = constellation[modifier].map((x: any) => [x[0], 0]);
                } else {
                    constellation[modifier] = 0;
                }
                // update input fields
                if (constellation[modifier].push) {
                    constellation[modifier].forEach((x: any) => {
                        // @ts-expect-error TS(2304): Cannot find name 'Astrology'.
                        this.document.getElementById(`MCS ${Astrology.constellations[idx].name}-${Skills[x[0]]}-${modifier} Input`).value = x[1]
                    });
                } else {
                    // @ts-expect-error TS(2304): Cannot find name 'Astrology'.
                    this.document.getElementById(`MCS ${Astrology.constellations[idx].name}-${modifier} Input`).value = constellation[modifier];
                }
            }
        });
        this.app.updateAstrologySummary();
    }

    checkRadio(baseID: any, check: any) {
        const yesOrNo = check ? 'Yes' : 'No';
        this.document.getElementById(`${baseID} Radio ${yesOrNo}`).checked = true;
    }
}