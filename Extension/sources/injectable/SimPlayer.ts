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

    const reqs = [];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * SimPlayer class, allows creation of a functional Player object without affecting the game
         */
        MICSR.SimPlayer = class extends Player {
            constructor(simManager) {
                super(simManager);
                this.detachGlobals();
                this.replaceGlobals();
                // remove standard spell selection
                this.spellSelection.standard = -1
                // overwrite food consumption
                this.food.consume = (quantity = 1) => {
                    this.usedFood += quantity;
                }
                // data names for serialization
                this.dataNames = {
                    booleanArrays: [
                        'petUnlocked',
                        'courseMastery',
                    ],
                    numberArrays: [
                        'skillLevel',
                        'course',
                    ],
                    booleans: [
                        'potionSelected',
                        'summoningSynergy',
                        'cookingPool',
                        'cookingMastery',
                        'useCombinationRunesFlag',
                        'healAfterDeath',
                        'isManualEating',
                        'isSlayerTask',
                        'hasRunes',
                    ],
                    numbers: [
                        'currentGamemode',
                        'pillar',
                        'potionTier',
                        'potionID',
                        'autoEatTier',
                        'activeAstrologyModifiers', // this is an array of dictionaries, but it (de)serializes fine
                    ],
                }
                //
            }

            initForWebWorker() {
                currentGamemode = this.currentGamemode;
                numberMultiplier = combatTriangle[GAMEMODES[this.currentGamemode].numberMultiplier];
                // recompute stats
                this.updateForEquipmentChange();
                this.resetGains();
            }

            // detach globals attached by parent constructor
            detachGlobals() {
                this.splashManager = {
                    add: () => {
                    },
                };
                this.effectRenderer = {
                    queueRemoval: () => {
                    },
                    queueRemoveAll: () => {
                    },
                    removeEffects: () => {
                    },
                    addStun: () => {
                    },
                    addSleep: () => {
                    },
                    addCurse: () => {
                    },
                    addDOT: () => {
                    },
                    addReflexive: () => {
                    },
                    addStacking: () => {
                    },
                    addModifier: () => {
                    },
                };
                this.statElements = undefined;
                this.attackBar = undefined;
                this.summonBar = undefined;
            }

            // get grandparent addHitpoints
            get characterAddHitpoints() {
                return Character.prototype.addHitpoints;
            }

            // get grandparent setHitpoints
            get characterSetHitpoints() {
                return Character.prototype.setHitpoints;
            }

            addHitpoints(amount) {
                this.characterAddHitpoints(amount);
                this.updateHPConditionals();
            }

            setHitpoints(value) {
                this.characterSetHitpoints(value);
            }

            addItemStat() {
            }

            trackPrayerStats() {
            }

            trackWeaponStat() {
            }

            setCallbacks() {
            }

            processDeath() {
                this.removeAllEffects(true);
                this.computeAllStats();
                this.setHitpoints(Math.floor(this.stats.maxHitpoints * 0.2));
                while (this.healAfterDeath && this.hitpoints < this.stats.maxHitpoints && this.food.currentSlot.quantity > 0) {
                    this.eatFood();
                }
            }

            // replace globals with properties
            replaceGlobals() {
                // skillLevel
                this.skillLevel = skillLevel.map(_ => 1);
                this.skillLevel[Skills.Hitpoints] = 10;
                // currentGamemode, numberMultiplier
                this.currentGamemode = currentGamemode;
                // petUnlocked
                this.petUnlocked = petUnlocked.map(x => false);
                // chosenAgilityObstacles, agility MASTERY, agilityPassivePillarActive
                this.course = Array(10).fill(-1);
                this.courseMastery = Array(10).fill(false);
                this.pillar = -1;
                // herbloreBonuses
                this.potionSelected = false;
                this.potionTier = 0;
                this.potionID = -1;
                // isSynergyUnlocked
                this.summoningSynergy = true;
                // shopItemsPurchased
                this.autoEatTier = -1;
                // cooking MASTERY
                this.cookingPool = false;
                this.cookingMastery = false;
                // useCombinationRunes
                this.useCombinationRunesFlag = false;
                this.combinations = items.filter(x => x.type === 'Rune' && x.providesRune).map(x => x.id);
                // other
                this.healAfterDeath = true;
                this.isSlayerTask = false;
                this.isManualEating = false;
                // gp, skillXP, PETS, slayercoins
                this.resetGains();
                // conditionalModifiers
                this.conditionalModifiers = new Map();
                itemConditionalModifiers.forEach((itemCondition) => {
                    this.conditionalModifiers.set(itemCondition.itemID, itemCondition.conditionals.map(x => {
                        return {...x}
                    }));
                });
                // activeAstrologyModifiers
                this.activeAstrologyModifiers = [];
                // runes in bank
                this.hasRunes = true;
            }

            // override getters
            get activeTriangle() {
                return combatTriangle[GAMEMODES[this.currentGamemode].combatTriangle];
            }

            get useCombinationRunes() {
                return this.useCombinationRunesFlag;
            }

            set useCombinationRunes(useCombinationRunes) {
                this.useCombinationRunesFlag = useCombinationRunes;
            }

            get allowRegen() {
                return GAMEMODES[this.currentGamemode].hasRegen;
            }

            rollForSummoningMarks() {
            }

            computeConditionalListeners() {
                // Reset the listener sets
                Object.values(this.conditionalListeners).forEach((list) => list.clear());
                // Equipped Items
                this.equipment.slotArray.forEach((slot) => {
                    const item = slot.item;
                    if (slot.providesStats) {
                        const conditionals = this.conditionalModifiers.get(item.id);
                        if (conditionals !== undefined) {
                            this.registerConditionalListeners(conditionals);
                        }
                    }
                });
                // Summoning Synergy
                const synergy = this.activeSummoningSynergy;
                if ((synergy === null || synergy === void 0 ? void 0 : synergy.conditionalModifiers) !== undefined)
                    this.registerConditionalListeners(synergy.conditionalModifiers);
                // Equipment Synergy
                this.activeItemSynergies.forEach((synergy) => {
                    if (synergy.conditionalModifiers !== undefined)
                        this.registerConditionalListeners(synergy.conditionalModifiers);
                });
            }

            resetGains() {
                this.gp = 0;
                this.skillXP = skillLevel.map(_ => 0);
                this.petRolls = {};
                this._slayercoins = 0;
                this.usedAmmo = 0;
                this.usedFood = 0;
                this.usedRunes = {};
                this.usedPotionCharges = 0;
                this.usedPrayerPoints = 0;
                this.chargesUsed = {
                    Summon1: 0,
                    Summon2: 0,
                };
                this.highestDamageTaken = 0;
                this.lowestHitpoints = this.stats.maxHitpoints;
                // hack to avoid auto eating infinite birthday cakes
                const autoHealAmt = Math.floor(this.getFoodHealing(this.food.currentSlot.item) * this.autoEatEfficiency / 100);
                this.emptyAutoHeal = this.autoEatThreshold > 0 && autoHealAmt === 0;
                this.hitpoints = this.stats.maxHitpoints;
            }

            getGainsPerSecond(ticks) {
                const seconds = ticks / 20;
                const usedRunesBreakdown = {};
                let usedRunes = 0;
                let usedCombinationRunes = 0;
                for (const id in this.usedRunes) {
                    const amt = this.usedRunes[id] / seconds;
                    usedRunesBreakdown[id] = amt;
                    if (this.combinations.includes(Number(id))) {
                        usedCombinationRunes += amt;
                    } else {
                        usedRunes += amt;
                    }
                }
                const petRolls = {};
                for (const interval in this.petRolls) {
                    petRolls[interval] = this.petRolls[interval] / seconds;
                }
                let usedSummoningCharges = (this.chargesUsed.Summon1 + this.chargesUsed.Summon2);
                if (this.chargesUsed.Summon1 > 0 && this.chargesUsed.Summon2 > 0) {
                    usedSummoningCharges /= 2;
                }
                return {
                    gp: this.gp / seconds,
                    skillXP: this.skillXP.map(x => x / seconds),
                    petRolls: petRolls,
                    slayercoins: this.slayercoins / seconds,
                    usedAmmo: this.usedAmmo / seconds,
                    usedRunesBreakdown: usedRunesBreakdown,
                    usedRunes: usedRunes,
                    usedCombinationRunes: usedCombinationRunes,
                    usedFood: this.usedFood / seconds,
                    usedPotionCharges: this.usedPotionCharges / seconds,
                    usedPrayerPoints: this.usedPrayerPoints / seconds,
                    usedSummoningCharges: usedSummoningCharges / seconds,
                    highestDamageTaken: this.highestDamageTaken,
                    lowestHitpoints: this.lowestHitpoints,
                }
            }

            tick() {
                super.tick();
                if (this.isManualEating) {
                    this.manualEat();
                }
            }

            // this method does not care about overeating
            // eats at most once per tick
            manualEat() {
                // don't eat at full health
                if (this.hitpoints >= this.stats.maxHitpoints) {
                    return;
                }
                // don't eat if eating heals 0 hp
                const healAmt = this.getFoodHealing(this.food.currentSlot.item);
                if (healAmt <= 0) {
                    return;
                }
                // eat without repercussions when enemy is spawning
                if (this.manager.spawnTimer.active) {
                    this.eatFood();
                    return;
                }
                // don't eat outside combat
                if (!this.manager.isInCombat) {
                    return;
                }
                // check dotDamage
                // TODO: this could be handled more efficiently, consider when the DOTs will hit
                const dotDamage = this.getMaxDotDamage();
                if (dotDamage >= this.hitpoints) {
                    this.eatFood();
                    return;
                }
                // check enemy damage
                const enemy = this.manager.enemy;
                // if enemy doesn't attack next turn, don't eat
                if (enemy.nextAction !== 'Attack') {
                    return;
                }
                // number of ticks until the enemy attacks
                const tLeft = enemy.timers.act.ticksLeft;
                if (tLeft < 0) {
                    return;
                }
                // max hit of the enemy attack + max dotDamage
                // TODO: this could be handled more efficiently, consider when the different attacks will hit
                const maxDamage = enemy.getAttackMaxDamage(enemy.nextAttack) + dotDamage;
                // number of ticks required to heal to safety
                const healsReq = Math.ceil((maxDamage + 1 - this.hitpoints) / healAmt);
                // don't eat until we have to
                if (healsReq < tLeft) {
                    return;
                }
                this.eatFood();
            }

            getMaxDotDamage() {
                let dotDamage = 0;
                this.activeDOTs.forEach(dot => {
                    if (dot.type === 'Regen') {
                        return;
                    }
                    dotDamage += dot.damage;
                });
                return dotDamage;
            }

            addSlayerCoins(amount) {
                amount = applyModifier(amount, this.modifiers.increasedSlayerCoins - this.modifiers.decreasedSlayerCoins, 0);
                this._slayercoins += amount;
            }

            addGP(amount) {
                this.gp += amount;
            }

            addXP(skill, amount) {
                this.skillXP[skill] += this.getSkillXPToAdd(skill, amount);
            }

            addPetModifiers() {
                PETS.forEach((pet, i) => {
                    if (this.petUnlocked[i] && !pet.activeInRaid && pet.modifiers !== undefined) {
                        this.modifiers.addModifiers(pet.modifiers);
                    }
                });
            }

            addConditionalModifiers() {
                this.conditionalListeners.All.forEach((conditional) => {
                    if (conditional.target === ModifierTarget.Player &&
                        !conditional.hooks.includes('PlayerHitpoints') &&
                        (
                            // for the combat simulator we always assume the bank and glove conditions are true
                            // instead of skipping the entire conditional, we set condition.active to true in case this is used elsewhere
                            conditional.hooks.includes('BankItem')
                            || conditional.hooks.includes('GloveCharges')
                            // other conditions are still checked, TODO: if there are multiple conditions, one of which is bank or glove charge, the others are not checked
                            || conditional.condition(this)
                        )) {
                        this.modifiers.addModifiers(conditional.modifiers);
                        conditional.isActive = true;
                    }
                });
            }

            addAgilityModifiers() {
                MICSR.addAgilityModifiers(this.course, this.courseMastery, this.pillar, this.modifiers);
            }

            addAstrologyModifiers() {
                for (let i = 0; i < this.activeAstrologyModifiers.length; i++) {
                    this.modifiers.addModifiers(this.activeAstrologyModifiers[i]);
                }
            }

            addMiscModifiers() {
                // Knight's Defender
                if (this.equipment.checkForItemID(Items.Knights_Defender) && this.attackType === 'melee') {
                    this.modifiers.addModifiers({
                        decreasedAttackInterval: 100,
                        decreasedDamageReduction: 3,
                    });
                }
                if (this.modifiers.increasedNonMagicPoisonChance > 0 && this.attackType !== 'magic') {
                    this.modifiers.addModifiers({
                        increasedChanceToApplyPoison: this.modifiers.increasedNonMagicPoisonChance,
                    });
                }
            }

            addShopModifiers() {
                // auto eat modifiers
                for (let tier = 0; tier <= this.autoEatTier; tier++) {
                    this.modifiers.addModifiers(SHOP.General[1 + tier].contains.modifiers);
                }

                // other shop modifiers are not relevant for combat sim at this point
            }

            equipmentID(slotID) {
                return this.equipment.slotArray[slotID].item.id;
            }

            equipmentIDs() {
                return this.equipment.slotArray.map(x => x.item.id);
            }

            equipmentOccupiedBy(slotID) {
                return this.equipment.slotArray[slotID].occupiedBy;
            }

            getSkillXPToAdd(skill, xp) {
                let xpMultiplier = 1;
                xpMultiplier += this.modifiers.getSkillModifierValue("increasedSkillXP", skill) / 100;
                xpMultiplier -= this.modifiers.getSkillModifierValue("decreasedSkillXP", skill) / 100;
                xpMultiplier += (this.modifiers.increasedGlobalSkillXP - this.modifiers.decreasedGlobalSkillXP) / 100;
                return xp * xpMultiplier;
            }

            rewardXPAndPetsForDamage(damage) {
                damage = damage / numberMultiplier;
                const attackInterval = this.timers.act.maxTicks * TICK_INTERVAL;
                // Combat Style
                this.attackStyle.experienceGain.forEach((gain) => {
                    this.addXP(gain.skill, gain.ratio * damage);
                });
                // Hitpoints
                this.addXP(Skills.Hitpoints, damage * 1.33);
                // Prayer
                let prayerRatio = 0;
                this.activePrayers.forEach((pID) => {
                    return (prayerRatio += PRAYER[pID].pointsPerPlayer);
                });
                prayerRatio /= 3;
                if (prayerRatio > 0) {
                    this.addXP(Skills.Prayer, prayerRatio * damage);
                }
                // pets
                this.petRolls[attackInterval] = 1 + (this.petRolls[attackInterval] | 0);
            }

            // get skill level from property instead of global `skillLevel`
            getSkillLevel(skillID) {
                return Math.min(99, this.skillLevel[skillID]);
            }

            // don't render anything
            setRenderAll() {
            }

            render() {
            }

            getPotion() {
                return items[Herblore.potions[this.potionID].potionIDs[this.potionTier]];
            }

            // track potion usage instead of consuming
            consumePotionCharge(type) {
                if (this.potionSelected) {
                    const item = this.getPotion();
                    if (type === Herblore.potions[item.masteryID[1]].consumesOn
                        && !rollPercentage(this.modifiers.increasedChanceToPreservePotionCharge - this.modifiers.decreasedChanceToPreservePotionCharge)
                    ) {
                        this.usedPotionCharges++;
                    }
                }
            }

            reusePotion() {
            }

            addPotionModifiers() {
                if (this.potionSelected) {
                    const item = this.getPotion();
                    if (item.modifiers !== undefined) {
                        this.modifiers.addModifiers(item.modifiers);
                    }
                }
            }

            // track prayer point usage instead of consuming
            consumePrayerPoints(amount) {
                if (amount > 0) {
                    amount = this.applyModifiersToPrayerCost(amount);
                    this.consumePotionCharge("PrayerPointCost");
                    this.usedPrayerPoints += amount;
                }
            }

            // track ammo usage instead of consuming
            consumeAmmo() {
                if (!rollPercentage(this.modifiers.ammoPreservationChance)) {
                    this.usedAmmo++;
                }
            }

            consumeQuiver(type) {
                if (this.equipment.slots.Quiver.item.consumesOn === type) {
                    this.usedAmmo++;
                }
            }

            //
            getRuneCosts(spell) {
                let runeCost = spell.runesRequired;
                const spellCost = [];
                if (this.useCombinationRunes && spell.runesRequiredAlt !== undefined)
                    runeCost = spell.runesRequiredAlt;
                runeCost.forEach((cost) => {
                    const reducedCost = cost.qty - (this.runesProvided.get(cost.id) | 0);
                    if (reducedCost > 0) {
                        spellCost.push({
                            itemID: cost.id,
                            qty: reducedCost,
                        });
                    }
                });
                return spellCost;
            }

            // track rune usage instead of consuming
            consumeRunes(costs) {
                if (!rollPercentage(this.modifiers.runePreservationChance)) {
                    costs.forEach((cost) => {
                        if (this.usedRunes[cost.itemID] === undefined) {
                            this.usedRunes[cost.itemID] = 0;
                        }
                        this.usedRunes[cost.itemID] += cost.qty;
                    });
                }
            }

            onMagicAttackFailure() {
            }

            updateForEquipmentChange() {
                this.computeAllStats();
                this.interruptAttack();
                if (this.manager.fightInProgress) {
                    this.target.combatModifierUpdate();
                }
            }

            equipItem(itemID, set, slot = "Default", quantity = 1) {
                const equipment = this.equipmentSets[set];
                const itemToEquip = itemID === -1 ? emptyItem : items[itemID];
                if (slot === "Default") {
                    slot = itemToEquip.validSlots[0];
                }
                // clear other slots occupied by current slot
                equipment.slotArray.forEach(x => {
                    if (x.occupiedBy === slot) {
                        x.occupiedBy = "None";
                    }
                });
                equipment.equipItem(itemToEquip, slot, quantity);
            }

            unequipItem(set, slot) {
                const equipment = this.equipmentSets[set];
                equipment.unequipItem(slot);
            }

            equipFood(itemID) {
                if (itemID === -1) {
                    this.unequipFood();
                    return;
                }
                // Unequip previous food
                this.food.unequipSelected();
                // Proceed to equip the food
                this.food.equip(items[itemID], Infinity);
            }

            unequipFood() {
                this.food.unequipSelected();
            }

            getFoodHealingBonus(item) {
                let bonus = this.modifiers.increasedFoodHealingValue - this.modifiers.decreasedFoodHealingValue;
                if (item.cookingID !== undefined && this.cookingMastery) {
                    bonus += 20;
                }
                if (this.cookingPool) {
                    bonus += 10;
                }
                return bonus;
            }

            get synergyDescription() {
                const synergy = this.equippedSummoningSynergy;
                if (synergy !== undefined) {
                    if (this.isSynergyActive(synergy)) {
                        return synergy.langDescription;
                    } else {
                        return getLangString('MENU_TEXT', 'LOCKED');
                    }
                } else {
                    return '';
                }
            }

            get activeSummoningSynergy() {
                return this.getUnlockedSynergyData(this.equipment.slots.Summon1.item.id, this.equipment.slots.Summon2.item.id);
            }

            get equippedSummoningSynergy() {
                return this.getSynergyData(this.equipment.slots.Summon1.item.id, this.equipment.slots.Summon2.item.id);
            }

            getSynergyData(summon1, summon2) {
                var _a;
                return (_a = Summoning.synergiesByItemID.get(summon1)) === null || _a === void 0 ? void 0 : _a.get(summon2);
            }

            getUnlockedSynergyData(summon1, summon2) {
                if (!this.summoningSynergy) {
                    return undefined;
                }
                const synergyData = this.getSynergyData(summon1, summon2);
                if (synergyData !== undefined) {
                    return synergyData;
                }
                return undefined;
            }

            isCombatSynergyEquipped() {
                if (this.activeSummonSlots.length < 2)
                    return false;
                return (this.getUnlockedSynergyData(this.equipment.slots[this.activeSummonSlots[0]].item.id, this.equipment.slots[this.activeSummonSlots[1]].item.id) !== undefined);
            }

            isSynergyActive(summonID1, summonID2) {
                if (!this.summoningSynergy) {
                    return false;
                }
                const itemID1 = Summoning.marks[summonID1].itemID;
                const itemID2 = Summoning.marks[summonID2].itemID;
                return (this.getUnlockedSynergyData(itemID1, itemID2) !== undefined &&
                    this.equipment.checkForItemID(itemID1) &&
                    this.equipment.checkForItemID(itemID2));
            }

            removeSummonCharge(slot, charges = 1) {
                if (!rollPercentage(this.modifiers.increasedSummoningChargePreservation - this.modifiers.decreasedSummoningChargePreservation)) {
                    this.chargesUsed[slot] += charges;
                }
            }

            // don't disable selected spells
            checkMagicUsage() {
                const allowMagic = this.attackType === "magic" || this.modifiers.allowAttackAugmentingMagic > 0;
                this.canAurora = allowMagic;
                this.canCurse = allowMagic && !this.usingAncient;
            }

            // get grandparent rollToHit
            get characterRollToHit() {
                return Character.prototype.rollToHit;
            }

            rollToHit(target, attack) {
                return this.checkRequirements(this.manager.areaRequirements) && this.characterRollToHit(target, attack);
            }

            // get grandparent damage
            get characterDamage() {
                return Character.prototype.damage;
            }

            damage(amount, source, thieving = false) {
                this.characterDamage(amount, source);
                this.highestDamageTaken = Math.max(this.highestDamageTaken, amount);
                if (this.hitpoints > 0) {
                    this.autoEat();
                    if (this.hitpoints < (this.stats.maxHitpoints * this.modifiers.increasedRedemptionThreshold) / 100) {
                        this.heal(applyModifier(this.stats.maxHitpoints, this.modifiers.increasedRedemptionPercent));
                    }
                    if (this.hitpoints < (this.stats.maxHitpoints * this.modifiers.increasedCombatStoppingThreshold) / 100) {
                        this.manager.stopCombat();
                    }
                    this.lowestHitpoints = Math.min(this.lowestHitpoints, this.hitpoints);
                }
            }

            autoEat() {
                if (this.emptyAutoHeal) {
                    this.usedFood = Infinity;
                } else {
                    super.autoEat();
                }
            }

            checkRequirements(reqs, notifyOnFailure = false, failureMessage = 'do that.') {
                return reqs.every(req => this.checkRequirement(req, notifyOnFailure, failureMessage));
            }

            checkRequirement(requirement, notifyOnFailure = false, failureMessage = 'do that.') {
                let met = false;
                switch (requirement.type) {
                    case 'Level':
                        met = requirement.levels.every(levelReq => this.skillLevel[levelReq.skill] >= levelReq.level);
                        break;
                    case 'Dungeon':
                        met = true;
                        break;
                    case 'Completion':
                        met = true;
                        break;
                    case 'SlayerItem':
                        met = this.modifiers.bypassSlayerItems > 0 || this.equipment.checkForItemID(requirement.itemID);
                        break;
                    case 'ShopPurchase':
                        met = true;
                        break;
                }
                return met;
            }


            /** Serializes the SimPlayer object */
            serialize() {
                const writer = new DataWriter();
                writer.addVariableLengthChunk(super.serialize());
                this.dataNames.booleanArrays.forEach(x => this[x].forEach(y => writer.addBool(y)));
                this.dataNames.numberArrays.forEach(x => this[x].forEach(y => writer.addNumber(y)));
                this.dataNames.booleans.forEach(x => writer.addBool(this[x]));
                this.dataNames.numbers.forEach(x => writer.addNumber(this[x]));
                return writer.data;
            }

            /** Deserializes the SimPlayer object */
            deserialize(reader, version) {
                super.deserialize(reader.getVariableLengthChunk(), version);
                this.dataNames.booleanArrays.forEach(x => {
                    this[x] = this[x].map(_ => reader.getBool());
                });
                this.dataNames.numberArrays.forEach(x => {
                    this[x] = this[x].map(_ => reader.getNumber());
                });
                this.dataNames.booleans.forEach(x => this[x] = reader.getBool());
                this.dataNames.numbers.forEach(x => this[x] = reader.getNumber());
                // after reading the data, recompute stats and reset gains
                this.computeAllStats();
                this.resetGains();
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
    waitLoadOrder(reqs, setup, 'SimPlayer');

})();