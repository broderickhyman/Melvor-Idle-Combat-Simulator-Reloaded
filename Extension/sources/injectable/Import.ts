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
//     isManualEating: false,
//     isSlayerTask: false,
//     pillar: undefined,
//     potionID: undefined,
//     standard: 0,
//     summoningSynergy: true,
//     useCombinationRunes: false,
// }
// this.micsr.defaultSettings.levels[this.micsr.skillIDs.Hitpoints] = 10;

interface IImportSettings {
    version: any;
    // lists
    //TODO astrologyModifiers: any;
    //TODO course: any;
    courseMastery: any;
    equipment: any;
    levels: Map<string, number>;
    petUnlocked: Pet[];
    // objects
    styles: {
        magic: any;
        melee: any;
        ranged: any;
    };
    // simple values
    ancient: any;
    archaic: any;
    aurora: any;
    autoEatTier: number;
    cookingMastery: boolean;
    cookingPool: boolean;
    currentGamemode: any;
    curse: any;
    foodSelected: FoodItem;
    healAfterDeath: any;
    isManualEating: boolean;
    isSlayerTask: boolean;
    pillar: any;
    potionID: string | undefined;
    prayerSelected: string[];
    standard: any;
    summoningSynergy: any;
    useCombinationRunes: any;
}

/**
 * Class to handle importing
 */
class Import {
    app: App;
    autoEatTiers: ShopPurchase[];
    document: any;
    player: SimPlayer;
    micsr: MICSR;

    constructor(app: App) {
        this.app = app;
        this.micsr = app.micsr;
        this.player = app.player;
        this.document = document;
        this.autoEatTiers = [
            this.micsr.actualGame.shop.purchases.getObjectByID(
                "melvorD:Auto_Eat_Tier_I"
            )!,
            this.micsr.actualGame.shop.purchases.getObjectByID(
                "melvorD:Auto_Eat_Tier_II"
            )!,
            this.micsr.actualGame.shop.purchases.getObjectByID(
                "melvorD:Auto_Eat_Tier_III"
            )!,
        ];
    }

    /**
     * Callback for when the import button is clicked
     * @param {number} setID Index of equipmentSets from 0-2 to import
     */
    importButtonOnClick(setID: any) {
        // get potion
        let potionID: string | undefined = undefined;
        let potion = this.micsr.actualGame.items.potions.find((potion) => {
            return (
                potion.action.localID === "Combat" &&
                this.micsr.actualGame.potions.isPotionActive(potion)
            );
        });
        if (potion) {
            potionID = potion.id;
        }

        // get foodSelected
        const foodSelected =
            this.micsr.actualGame.combat.player.food.currentSlot.item;
        // get cooking mastery for foodSelected
        let cookingMastery = false;
        const recipe =
            this.micsr.actualGame.cooking.productRecipeMap.get(foodSelected);
        if (recipe && recipe.hasMastery) {
            cookingMastery =
                this.micsr.actualGame.cooking.getMasteryLevel(recipe) >= 99;
        }
        const cookingPool = this.micsr.actualGame.cooking.isPoolTierActive(3);

        // get the player's auto eat tier
        const autoEatTier =
            -1 +
            this.autoEatTiers.filter((x: any) =>
                this.micsr.actualGame.shop.isUpgradePurchased(x)
            ).length;
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
        const equipmentSet =
            this.micsr.actualGame.combat.player.equipmentSets[setID];
        const equipment = equipmentSet.equipment;

        // create settings object
        const settings: IImportSettings = {
            version: this.micsr.version,
            // lists
            //TODO astrologyModifiers: astrologyModifiers,
            //TODO course: chosenAgilityObstacles,
            courseMastery: this.micsr.actualGame.agility.actions.allObjects.map(
                (action) =>
                    this.micsr.actualGame.agility.getMasteryLevel(action) >= 99
            ),
            equipment: equipment.slotArray.map((x) => x.item.id),
            levels: new Map(
                this.micsr.actualGame.skills.allObjects.map((skill) => [
                    skill.id,
                    skill.level,
                ])
            ),
            petUnlocked: this.micsr.actualGame.pets.allObjects.filter((pet) =>
                this.micsr.actualGame.petManager.isPetUnlocked(pet)
            ),
            // objects
            styles: {
                magic: this.micsr.actualGame.attackStyles.find(
                    (style) => style.attackType === "magic"
                )!.id,
                melee: this.micsr.actualGame.attackStyles.find(
                    (style) => style.attackType === "melee"
                )!.id,
                ranged: this.micsr.actualGame.attackStyles.find(
                    (style) => style.attackType === "ranged"
                )!.id,
            },
            // simple values
            ancient: equipmentSet.spellSelection.ancient,
            archaic: equipmentSet.spellSelection.archaic,
            aurora: equipmentSet.spellSelection.aurora,
            autoEatTier: autoEatTier,
            cookingMastery: cookingMastery,
            cookingPool: cookingPool,
            currentGamemode: this.micsr.actualGame.currentGamemode,
            curse: equipmentSet.spellSelection.curse,
            foodSelected: foodSelected,
            healAfterDeath: this.player.healAfterDeath,
            isManualEating: this.player.isManualEating,
            isSlayerTask: this.player.isSlayerTask,
            pillar:
                this.micsr.game.agility.builtPassivePillar === undefined
                    ? -1
                    : this.micsr.game.agility.builtPassivePillar.id,
            potionID: potionID,
            prayerSelected: Array.from(equipmentSet.prayerSelection).map(
                (p) => p.id
            ),
            standard: equipmentSet.spellSelection.standard,
            summoningSynergy: this.player.summoningSynergy, // TODO: import mark levels
            useCombinationRunes:
                this.micsr.actualGame.settings.useCombinationRunes,
        };

        // import settings
        this.importSettings(settings);
    }

    exportSettings(): IImportSettings {
        const courseMastery = {};
        this.player.course.forEach(
            (o: any, i: any) =>
                // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                (courseMastery[o] = this.player.courseMastery[i])
        );
        return {
            version: this.micsr.version,
            // lists
            astrologyModifiers: this.player.activeAstrologyModifiers,
            course: [...this.player.course],
            courseMastery: courseMastery,
            equipment: this.player.equipment.slotArray.map(
                (x: any) => x.item.id
            ),
            levels: this.player.skillLevel,
            petUnlocked: [...this.player.petUnlocked],
            // objects
            styles: { ...this.player.attackStyles },
            prayerSelected: Array.from(this.player.activePrayers).map(
                (p) => p.id
            ),
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
            isManualEating: this.player.isManualEating,
            isSlayerTask: this.player.isSlayerTask,
            pillar: this.player.pillar,
            potionID: this.player.potion?.id,
            standard: this.player.spellSelection.standard,
            summoningSynergy: this.player.summoningSynergy,
            useCombinationRunes: this.player.useCombinationRunes,
        };
    }

    importSettings(settings: IImportSettings) {
        if (settings.version !== this.micsr.version) {
            this.micsr.warn(
                `Importing MICSR ${settings.version} settings in MICSR ${this.micsr.version}.`
            );
        }
        // validate
        // for (const prop in this.micsr.defaultSettings) {
        //     if (settings[prop] === undefined) {
        //         this.micsr.log(
        //             `No valid ${prop} data imported, using default ${this.micsr.defaultSettings[prop]}.`
        //         );
        //         settings[prop] = this.micsr.defaultSettings[prop];
        //     }
        // }
        // import settings
        this.importLevels(settings.levels);
        this.importEquipment(settings.equipment);
        this.importStyle(settings.styles);
        this.importSpells({
            ancient: settings.ancient,
            archaic: settings.archaic,
            aurora: settings.aurora,
            curse: settings.curse,
            standard: settings.standard,
        });
        this.importPrayers(settings.prayerSelected);
        this.importPotion(settings.potionID);
        this.importPets(settings.petUnlocked);
        this.importAutoEat(
            settings.autoEatTier,
            settings.foodSelected,
            settings.cookingPool,
            settings.cookingMastery
        );
        this.importManualEating(settings.isManualEating);
        this.importHealAfterDeath(settings.healAfterDeath);
        this.importSlayerTask(settings.isSlayerTask);
        this.importGameMode(settings.currentGamemode);
        this.importUseCombinationRunes(settings.useCombinationRunes);
        // TODO this.importAgilityCourse(settings.course, settings.courseMastery, settings.pillar);
        this.importSummoningSynergy(settings.summoningSynergy);
        // TODO this.importAstrology(settings.astrologyModifiers);

        // update and compute values
        this.app.updateUi();

        // notify completion
        this.app.notify("Import completed.");
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
            if (itemID === "melvorD:Empty_Equipment") {
                continue;
            }
            this.app.equipItem(
                slotID,
                this.micsr.items.getObjectByID(itemID),
                false
            );
        }
        // update style drop down
        this.app.updateStyleDropdowns();
    }

    importLevels(levels: Map<string, number>) {
        this.app.skillKeys.forEach((key) => {
            this.document.getElementById(`MCS ${key} Input`).value = levels.get(
                this.micsr.skillIDs[key]
            );
        });
        this.player.skillLevel = levels;
    }

    importStyle(styles: any) {
        ["melee", "ranged", "magic"].forEach((cbStyle) => {
            const attackStyle = this.micsr.game.attackStyles.getObjectByID(
                styles[cbStyle]
            )!;
            const index = this.micsr.attackStylesIdx[attackStyle.id];
            // @ts-expect-error
            this.player.setAttackStyle(cbStyle, attackStyle);
            this.document.getElementById(
                `MCS ${cbStyle} Style Dropdown`
            ).selectedIndex = index % 3;
        });
    }

    importSpells(spellSelection: any) {
        // Set all active spell UI to be disabled
        Object.keys(this.app.combatData.spells).forEach((spellType) => {
            const spellID = this.player.getSpellFromType(spellType);
            this.app.disableSpell(spellType, spellID);
            this.app.enableSpell(spellType, spellSelection[spellType]);
        });
        this.app.spellSanityCheck();
    }

    importPrayers(prayerSelected: string[]) {
        // Toggle old prayers off
        this.player.activePrayers.clear();
        // Update prayers
        this.micsr.prayers.forEach((prayer) => {
            const prayButton = this.document.getElementById(
                `MCS ${this.app.getPrayerName(prayer)} Button`
            );
            if (prayerSelected.includes(prayer.id)) {
                this.app.selectButton(prayButton);
                this.player.activePrayers.add(prayer);
            } else {
                this.app.unselectButton(prayButton);
            }
        });
    }

    importPotion(potionID: string | undefined) {
        // Deselect potion if selected
        if (this.player.potion) {
            this.app.unselectButton(
                this.document.getElementById(
                    `MCS ${this.app.getPotionHtmlId(this.player.potion)} Button`
                )
            );
            this.player.potion = undefined;
        }
        // Select new potion if applicable
        if (potionID) {
            const potion = this.app.manager.game.items.potions.find(
                (p) => p.id === potionID
            );
            this.player.potion = potion;
            if (this.player.potion) {
                this.app.selectButton(
                    this.document.getElementById(
                        `MCS ${this.app.getPotionHtmlId(
                            this.player.potion
                        )} Button`
                    )
                );
                this.app.updatePotionTier(this.player.potion.tier);
            }
        }
    }

    importPets(petUnlocked: Pet[]) {
        this.player.petUnlocked = [];
        this.app.micsr.pets.forEach((pet) => {
            this.app.unselectButton(
                this.document.getElementById(`MCS ${pet.name} Button`)
            );
        });
        // Import pets
        petUnlocked.forEach((pet: Pet) => {
            this.player.petUnlocked.push(pet);
            this.app.selectButton(
                this.document.getElementById(`MCS ${pet.name} Button`)
            );
            // if (petID === 4 && owned)
            //     this.document.getElementById("MCS Rock").style.display = "";
        });
    }

    importAutoEat(
        autoEatTier: number,
        foodSelected: FoodItem,
        cookingPool: boolean,
        cookingMastery: boolean
    ) {
        // Import Food Settings
        this.player.autoEatTier = autoEatTier;
        this.document.getElementById(
            "MCS Auto Eat Tier Dropdown"
        ).selectedIndex = autoEatTier + 1;
        this.app.equipFood(foodSelected);
        this.checkRadio("MCS 95% Cooking Pool", cookingPool);
        this.player.cookingPool = cookingPool;
        this.checkRadio("MCS 99 Cooking Mastery", cookingMastery);
        this.player.cookingMastery = cookingMastery;
    }

    importManualEating(isManualEating: boolean) {
        this.checkRadio("MCS Manual Eating", isManualEating);
        this.player.isManualEating = isManualEating;
    }

    importHealAfterDeath(healAfterDeath: boolean) {
        this.checkRadio("MCS Heal After Death", healAfterDeath);
        this.player.healAfterDeath = healAfterDeath;
    }

    importSlayerTask(isSlayerTask: boolean) {
        // Update slayer task mode
        this.checkRadio("MCS Slayer Task", isSlayerTask);
        this.player.isSlayerTask = isSlayerTask;
        this.app.slayerTaskSimsToggle();
    }

    importGameMode(gamemode: any) {
        this.player.currentGamemode = gamemode;
        const index = this.micsr.gamemodes.findIndex(
            (x: any) => x.id === gamemode.id
        );
        this.document.getElementById("MCS Game Mode Dropdown").selectedIndex =
            index;
    }

    importSummoningSynergy(summoningSynergy: any) {
        // Update summoningSynergy
        this.player.summoningSynergy = summoningSynergy;
    }

    importUseCombinationRunes(useCombinationRunes: boolean) {
        // Update hardcore mode
        this.checkRadio("MCS Use Combination Runes", useCombinationRunes);
        this.player.useCombinationRunes = useCombinationRunes;
    }

    importAgilityCourse(course: any, masteries: any, pillar: any) {
        this.app.agilityCourse.importAgilityCourse(course, masteries, pillar);
    }

    importAstrology(astrologyModifiers: any) {
        this.player.activeAstrologyModifiers.forEach(
            (constellation: any, idx: any) => {
                for (const modifier in constellation) {
                    // import values and set rest to 0
                    if (
                        astrologyModifiers[idx] !== undefined &&
                        astrologyModifiers[idx][modifier] !== undefined
                    ) {
                        constellation[modifier] =
                            astrologyModifiers[idx][modifier];
                        if (constellation[modifier].push) {
                            // filter non combat skill modifiers
                            constellation[modifier] = constellation[
                                modifier
                            ].filter((x: any) =>
                                this.micsr.showModifiersInstance.relevantModifiers.combat.skillIDs.includes(
                                    x[0]
                                )
                            );
                        }
                    } else if (constellation[modifier].push) {
                        // keep entries per skill, but set value to 0
                        constellation[modifier] = constellation[modifier].map(
                            (x: any) => [x[0], 0]
                        );
                    } else {
                        constellation[modifier] = 0;
                    }
                    // update input fields
                    if (constellation[modifier].push) {
                        constellation[modifier].forEach((x: any) => {
                            // @ts-expect-error TS(2304): Cannot find name 'Astrology'.
                            this.document.getElementById(
                                `MCS ${Astrology.constellations[idx].name}-${
                                    Skills[x[0]]
                                }-${modifier} Input`
                            ).value = x[1];
                        });
                    } else {
                        // @ts-expect-error TS(2304): Cannot find name 'Astrology'.
                        this.document.getElementById(
                            `MCS ${Astrology.constellations[idx].name}-${modifier} Input`
                        ).value = constellation[modifier];
                    }
                }
            }
        );
        this.app.updateAstrologySummary();
    }

    checkRadio(baseID: string, check: boolean) {
        const yesOrNo = check ? "Yes" : "No";
        this.document.getElementById(`${baseID} Radio ${yesOrNo}`).checked =
            true;
    }
}
