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

    const reqs: any = [];

    const setup = () => {

        const MICSR = (window as any).MICSR;

        /**
         * SimPlayer class, allows creation of a functional Player object without affecting the game
         */
        // @ts-expect-error TS(2304): Cannot find name 'Player'.
        MICSR.SimPlayer = class extends Player {
            _slayercoins: any;
            activeAstrologyModifiers: any;
            activeDOTs: any;
            activeItemSynergies: any;
            activePrayers: any;
            activeSummonSlots: any;
            applyModifiersToPrayerCost: any;
            attackStyle: any;
            attackType: any;
            autoEatEfficiency: any;
            autoEatThreshold: any;
            autoEatTier: any;
            canAurora: any;
            canCurse: any;
            chargesUsed: any;
            combinations: any;
            cookingMastery: any;
            cookingPool: any;
            course: any;
            courseMastery: any;
            currentGamemode: any;
            dataNames: any;
            eatFood: any;
            emptyAutoHeal: any;
            equipment: any;
            equipmentSets: any;
            food: any;
            getFoodHealing: any;
            gp: any;
            hasRunes: any;
            heal: any;
            healAfterDeath: any;
            highestDamageTaken: any;
            hitpoints: any;
            interruptAttack: any;
            isManualEating: any;
            isSlayerTask: any;
            lowestHitpoints: any;
            manager: any;
            modifiers: any;
            petRolls: any;
            petUnlocked: any;
            pillar: any;
            potionID: any;
            potionSelected: any;
            potionTier: any;
            runesProvided: any;
            skillLevel: any;
            skillXP: any;
            slayercoins: any;
            spellSelection: any;
            stats: any;
            summoningSynergy: any;
            target: any;
            timers: any;
            useCombinationRunesFlag: any;
            usedAmmo: any;
            usedFood: any;
            usedPotionCharges: any;
            usedPrayerPoints: any;
            usedRunes: any;
            usingAncient: any;
            activeSummoningSynergy: any;

            constructor(simManager: any, simGame: any) {
                super(simManager, simGame);
                this.detachGlobals();
                this.replaceGlobals();
                // remove standard spell selection
                this.spellSelection.standard = undefined;
                // overwrite food consumption
                this.food.consume = (quantity = 1) => {
                    this.usedFood += quantity;
                }
                // data names for serialization
                this.dataNames = {
                    booleanArrays: [
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

            _attackBar: any;

            get attackBar() {
                return this._attackBar;
            }

            _effectRenderer: any;

            get effectRenderer() {
                return this._effectRenderer;
            }

            _splashManager: any;

            get splashManager() {
                return this._splashManager;
            }

            _statElements: any;

            get statElements() {
                return this._statElements;
            }

            _summonBar: any;

            get summonBar() {
                return this._summonBar;
            }

            // override getters
            get activeTriangle() {
                // @ts-expect-error TS(2304): Cannot find name 'combatTriangle'.
                return combatTriangle[GAMEMODES[this.currentGamemode].combatTriangle];
            }

            get useCombinationRunes() {
                return this.useCombinationRunesFlag;
            }

            set useCombinationRunes(useCombinationRunes) {
                this.useCombinationRunesFlag = useCombinationRunes;
            }

            get allowRegen() {
                // @ts-expect-error TS(2304): Cannot find name 'GAMEMODES'.
                return GAMEMODES[this.currentGamemode].hasRegen;
            }

            get synergyDescription() {
                const synergy = this.equippedSummoningSynergy;
                if (synergy !== undefined) {
                    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                    if (this.isSynergyActive(synergy)) {
                        return synergy.langDescription;
                    } else {
                        // @ts-expect-error TS(2304): Cannot find name 'getLangString'.
                        return getLangString('MENU_TEXT', 'LOCKED');
                    }
                } else {
                    return '';
                }
            }

            get equippedSummoningSynergy() {
                return this.getSynergyData(this.equipment.slots.Summon1.item.id, this.equipment.slots.Summon2.item.id);
            }

            static newFromPlayerString(manager: any, playerString: string) {
                const reader = new MICSR.SaveWriter('Read', 1);
                reader.setDataFromSaveString(playerString);
                const newSimPlayer = new MICSR.SimPlayer(manager, MICSR.game);
                newSimPlayer.decode(reader, MICSR.currentSaveVersion);
                return newSimPlayer;
            }

            initForWebWorker() {
                // // @ts-expect-error TS(2663): Cannot find name 'currentGamemode'. Did you mean t... Remove this comment to see the full error message
                //currentGamemode = this.currentGamemode;
                // @ts-expect-error TS(2304): Cannot find name 'numberMultiplier'.
                numberMultiplier = combatTriangle[GAMEMODES[this.currentGamemode].numberMultiplier];
                // recompute stats
                this.updateForEquipmentChange();
                this.resetGains();
            }

            // detach globals attached by parent constructor
            detachGlobals() {
                this._splashManager = {
                    add: () => {
                    },
                };
                this._effectRenderer = {
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
                this._statElements = undefined;
                this._attackBar = undefined;
                this._summonBar = undefined;
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
                super.removeAllEffects(true);
                super.setHitpoints(Math.floor(this.stats.maxHitpoints * 0.2));
                // heal after death if required
                while (this.healAfterDeath && this.hitpoints < this.stats.maxHitpoints && this.food.currentSlot.quantity > 0) {
                    this.eatFood();
                }
            }

            // replace globals with properties
            replaceGlobals() {
                // skillLevel
                this.skillLevel = MICSR.skillNames.map((_: any) => 1);
                this.skillLevel[MICSR.skillIDs.Hitpoints] = 10;
                // currentGamemode, numberMultiplier
                this.currentGamemode = MICSR.game.currentGamemode;
                // petUnlocked
                this.petUnlocked = {};
                MICSR.pets.allObjects.forEach((pet: any) => this.petUnlocked[pet.id] = false);
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
                this.combinations = MICSR.items.filter((x: any) => x.type === 'Rune' && x.providesRune).map((x: any) => x.id);
                // other
                this.healAfterDeath = true;
                this.isSlayerTask = false;
                this.isManualEating = false;
                // gp, skillXP, pets, slayercoins
                this.resetGains();
                // activeAstrologyModifiers
                this.activeAstrologyModifiers = [];
                // runes in bank
                this.hasRunes = true;
            }

            rollForSummoningMarks() {
            }

            resetGains() {
                this.gp = 0;
                this.skillXP = MICSR.skillNames.map((_: any) => 0);
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

            getGainsPerSecond(ticks: any) {
                const seconds = ticks / 20;
                const usedRunesBreakdown = {};
                let usedRunes = 0;
                let usedCombinationRunes = 0;
                for (const id in this.usedRunes) {
                    const amt = this.usedRunes[id] / seconds;
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    usedRunesBreakdown[id] = amt;
                    if (this.combinations.includes(Number(id))) {
                        usedCombinationRunes += amt;
                    } else {
                        usedRunes += amt;
                    }
                }
                const petRolls = {};
                for (const interval in this.petRolls) {
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    petRolls[interval] = this.petRolls[interval] / seconds;
                }
                let usedSummoningCharges = (this.chargesUsed.Summon1 + this.chargesUsed.Summon2);
                if (this.chargesUsed.Summon1 > 0 && this.chargesUsed.Summon2 > 0) {
                    usedSummoningCharges /= 2;
                }
                return {
                    gp: this.gp / seconds,
                    skillXP: this.skillXP.map((x: any) => x / seconds),
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
                };
            }

            tick() {
                super.tick();
                if (this.isManualEating) {
                    this.manualEat();
                }
            }

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
                this.activeDOTs.forEach((dot: any) => {
                    if (dot.type === 'Regen') {
                        return;
                    }
                    dotDamage += dot.damage;
                });
                return dotDamage;
            }

            addSlayerCoins(amount: any) {
                // @ts-expect-error TS(2304): Cannot find name 'applyModifier'.
                amount = applyModifier(amount, this.modifiers.increasedSlayerCoins - this.modifiers.decreasedSlayerCoins, 0);
                this._slayercoins += amount;
            }

            addGP(amount: any) {
                this.gp += amount;
            }

            addXP(skill: any, amount: any) {
                this.skillXP[skill] += this.getSkillXPToAdd(skill, amount);
            }

            addPetModifiers() {
                MICSR.pets.allObjects.forEach((pet: any, i: any) => {
                    if (this.petUnlocked[pet.id] && !pet.activeInRaid && pet.modifiers !== undefined) {
                        this.modifiers.addModifiers(pet.modifiers);
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
                if (this.equipment.checkForItemID("melvorF:Knights_Defender" /* ItemIDs.Knights_Defender */) && this.attackType === 'melee') {
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
                    // @ts-expect-error TS(2304): Cannot find name 'SHOP'.
                    this.modifiers.addModifiers(SHOP.General[1 + tier].contains.modifiers);
                }

                // other shop modifiers are not relevant for combat sim at this point
            }

            equipmentID(slotID: any) {
                return this.equipment.slotArray[slotID].item.id;
            }

            equipmentIDs() {
                return this.equipment.slotArray.map((x: any) => x.item.id);
            }

            equipmentOccupiedBy(slotID: any) {
                return this.equipment.slotArray[slotID].occupiedBy;
            }

            getSkillXPToAdd(skill: any, xp: any) {
                let xpMultiplier = 1;
                xpMultiplier += this.modifiers.getSkillModifierValue("increasedSkillXP", skill) / 100;
                xpMultiplier -= this.modifiers.getSkillModifierValue("decreasedSkillXP", skill) / 100;
                xpMultiplier += (this.modifiers.increasedGlobalSkillXP - this.modifiers.decreasedGlobalSkillXP) / 100;
                return xp * xpMultiplier;
            }

            rewardXPAndPetsForDamage(damage: any) {
                // @ts-expect-error TS(2304): Cannot find name 'numberMultiplier'.
                damage = damage / numberMultiplier;
                // @ts-expect-error TS(2304): Cannot find name 'TICK_INTERVAL'.
                const attackInterval = this.timers.act.maxTicks * TICK_INTERVAL;
                // Combat Style
                this.attackStyle.experienceGain.forEach((gain: any) => {
                    this.addXP(gain.skill, gain.ratio * damage);
                });
                // Hitpoints
                this.addXP(MICSR.skillIDs.Hitpoints, damage * 1.33);
                // Prayer
                let prayerRatio = 0;
                this.activePrayers.forEach((pID: any) => {
                    return (prayerRatio += MICSR.prayers.getObjectByID(pID).pointsPerPlayer);
                });
                prayerRatio /= 3;
                if (prayerRatio > 0) {
                    this.addXP(MICSR.skillIDs.Prayer, prayerRatio * damage);
                }
                // pets
                this.petRolls[attackInterval] = 1 + (this.petRolls[attackInterval] | 0);
            }

            // get skill level from property instead of global `skillLevel`
            getSkillLevel(skillID: any) {
                return Math.min(99, this.skillLevel[skillID]);
            }

            // don't render anything
            setRenderAll() {
            }

            render() {
            }

            getPotion() {
                return MICSR.items.getObjectByID(MICSR.herblorePotions[this.potionID].potionIDs[this.potionTier]);
            }

            // track potion usage instead of consuming
            consumePotionCharge(type: any) {
                if (this.potionSelected) {
                    const item = this.getPotion();
                    // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                    if (type === Herblore.potions[item.masteryID[1]].consumesOn
                        // @ts-expect-error TS(2304): Cannot find name 'rollPercentage'.
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
            consumePrayerPoints(amount: any) {
                if (amount > 0) {
                    amount = this.applyModifiersToPrayerCost(amount);
                    this.consumePotionCharge("PrayerPointCost");
                    this.usedPrayerPoints += amount;
                }
            }

            // track ammo usage instead of consuming
            consumeAmmo() {
                // @ts-expect-error TS(2304): Cannot find name 'rollPercentage'.
                if (!rollPercentage(this.modifiers.ammoPreservationChance)) {
                    this.usedAmmo++;
                }
            }

            consumeQuiver(type: any) {
                if (this.equipment.slots.Quiver.item.consumesOn === type) {
                    this.usedAmmo++;
                }
            }

            //
            getRuneCosts(spell: any) {
                const spellCost: any = [];
                if (spell === undefined) {
                    return spellCost;
                }
                let runeCost = spell.runesRequired;
                if (this.useCombinationRunes && spell.runesRequiredAlt !== undefined) {
                    runeCost = spell.runesRequiredAlt;
                }
                runeCost.forEach((cost: any) => {
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
            consumeRunes(costs: any) {
                // @ts-expect-error TS(2304): Cannot find name 'rollPercentage'.
                if (!rollPercentage(this.modifiers.runePreservationChance)) {
                    costs.forEach((cost: any) => {
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
                super.computeAllStats();
                this.interruptAttack();
                if (this.manager.fightInProgress) {
                    this.target.combatModifierUpdate();
                }
            }

            equipItem(item: any, set: any, slot = "Default", quantity = 1) {
                const itemToEquip = item === undefined ? MICSR.emptyItems[slot] : item;
                if (slot === "Default") {
                    slot = itemToEquip.validSlots[0];
                }
                // clear other slots occupied by current slot
                this.equipment.slotArray.forEach((x: any) => {
                    if (x.occupiedBy === slot) {
                        x.occupiedBy = "None";
                    }
                });
                this.equipment.equipItem(itemToEquip, slot, quantity);
            }

            unequipItem(set: any, slot: any) {
                this.equipment.unequipItem(slot);
                this.updateForEquipmentChange();
            }

            equipFood(item: any) {
                if (item.id === 'melvorD:Empty_Equipment') {
                    this.unequipFood();
                    return;
                }
                // Unequip previous food
                this.food.unequipSelected();
                // Proceed to equip the food
                this.food.equip(item, Infinity);
            }

            unequipFood() {
                this.food.unequipSelected();
            }

            getFoodHealingBonus(item: any) {
                let bonus = this.modifiers.increasedFoodHealingValue - this.modifiers.decreasedFoodHealingValue;
                if (item.cookingID !== undefined && this.cookingMastery) {
                    bonus += 20;
                }
                if (this.cookingPool) {
                    bonus += 10;
                }
                return bonus;
            }

            computeSummoningSynergy() {
                this.activeSummoningSynergy = this.getUnlockedSynergyData(this.equipment.slots.Summon1.item, this.equipment.slots.Summon2.item);
            }

            getSynergyData(summon1: any, summon2: any) {
                let _a;
                return (_a = MICSR.game.summoning.synergiesByItem.get(summon1)) === null || _a === void 0 ? void 0 : _a.get(summon2);
            }

            getUnlockedSynergyData(summon1: any, summon2: any) {
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

            isSynergyActive(summonID1: any, summonID2: any) {
                if (!this.summoningSynergy) {
                    return false;
                }
                // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
                const itemID1 = Summoning.marks[summonID1].itemID;
                // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
                const itemID2 = Summoning.marks[summonID2].itemID;
                return (this.getUnlockedSynergyData(itemID1, itemID2) !== undefined &&
                    this.equipment.checkForItemID(itemID1) &&
                    this.equipment.checkForItemID(itemID2));
            }

            removeSummonCharge(slot: any, charges = 1) {
                // @ts-expect-error TS(2304): Cannot find name 'rollPercentage'.
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

            rollToHit(target: any, attack: any) {
                return this.checkRequirements(this.manager.areaRequirements) && super.rollToHit(target, attack);
            }

            damage(amount: any, source: any, thieving = false) {
                super.damage(amount, source);
                this.highestDamageTaken = Math.max(this.highestDamageTaken, amount);
                if (this.hitpoints > 0) {
                    this.autoEat();
                    if (this.hitpoints < (this.stats.maxHitpoints * this.modifiers.increasedRedemptionThreshold) / 100) {
                        // @ts-expect-error TS(2304): Cannot find name 'applyModifier'.
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

            checkRequirements(reqs: any, notifyOnFailure = false, failureMessage = 'do that.') {
                return reqs.every((req: any) => this.checkRequirement(req, notifyOnFailure, failureMessage));
            }

            checkRequirement(requirement: any, notifyOnFailure = false, failureMessage = 'do that.') {
                let met = false;
                switch (requirement.type) {
                    case 'Level':
                        met = requirement.levels.every((levelReq: any) => this.skillLevel[levelReq.skill] >= levelReq.level);
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

            hasKey<O>(obj: O, key: PropertyKey): key is keyof O {
                return key in obj
            }

            /** Encode the SimPlayer object */
            encode(writer: any) {
                super.encode(writer);
                this.dataNames.booleanArrays.forEach((x: PropertyKey) => {
                    console.log('encode boolean array', x)
                    if (this.hasKey(this, x)) {
                        (this[x] as unknown as boolean[]).forEach((y: any) => writer.writeBoolean(y));
                    }
                });
                this.dataNames.numberArrays.forEach((x: PropertyKey) => {
                    console.log('encode number array', x)
                    if (this.hasKey(this, x)) {
                        (this[x] as unknown as number[]).forEach((y: any) => writer.writeInt32(y));
                    }
                });
                this.dataNames.booleans.forEach((x: PropertyKey) => {
                    console.log('encode boolean', x)
                    if (this.hasKey(this, x)) {
                        writer.writeBoolean(this[x]);
                    }
                });
                this.dataNames.numbers.forEach((x: PropertyKey) => {
                    console.log('encode number', x)
                    if (this.hasKey(this, x)) {
                        writer.writeInt32(this[x]);
                    }
                });
                return writer.data;
            }

            /** Decode the SimPlayer object */
            decode(reader: any, version: any = MICSR.currentSaveVersion) {
                super.decode(reader, version);
                this.dataNames.booleans.forEach((x: PropertyKey) => {
                    console.log('decode boolean', x)
                    if (this.hasKey(this, x)) {
                        this[x] = reader.getBoolean();
                    }
                });
                this.dataNames.numbers.forEach((x: PropertyKey) => {
                    console.log('decode number', x)
                    if (this.hasKey(this, x)) {
                        this[x] = reader.getInt32();
                    }
                });
                // after reading the data, recompute stats and reset gains
                super.computeAllStats();
                this.resetGains();
            }

            generatePlayerString() {
                const micsrPlayerHeader = () => MICSR.actualGame.getSaveHeader()
                const writer = new MICSR.SaveWriter('Write', 512);
                this.encode(writer);
                return this.getSaveString(writer, micsrPlayerHeader());
            }

            getSaveString(w: any, headerInfo: any) {
                // Save namespace mapping as an array, as it is ordered
                w.header.writeMap(w.namespaceMap, (namespace: any, writer: any) => {
                    writer.writeString(namespace);
                }, (idMap: any, writer: any) => {
                    writer.writeMap(idMap, (localID: any, writer: any) => {
                        writer.writeString(localID);
                    }, (numericID: any, writer: any) => {
                        writer.writeUint16(numericID);
                    });
                });
                w.writeHeaderInfo(headerInfo);
                // Combine header and namespace data
                const headerData = w.header.getRawData();
                const bodyData = w.getRawData();
                const combinedData = new MICSR.BinaryWriter('Write', headerData.byteLength + bodyData.byteLength);
                combinedData.writeFixedLengthBuffer(w.stringEncoder.encode('melvor'), 6);
                combinedData.writeBuffer(headerData);
                combinedData.writeBuffer(bodyData);
                const rawSaveData = combinedData.getRawData();
                const compressedData = new Uint8Array(rawSaveData);
                console.log('sent', compressedData)
                return compressedData;/*
                const decoder = new TextDecoder('utf8');
                console.log(1, compressedData)
                console.log(2, decoder.decode(compressedData))
                const saveString = btoa(unescape(encodeURIComponent(decoder.decode(compressedData))));
                // console.log(`Compressed: ${compressedData.length} bytes. Save String: ${saveString.length} bytes`);
                return saveString;*/
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
    waitLoadOrder(reqs, setup, 'SimPlayer');

})();