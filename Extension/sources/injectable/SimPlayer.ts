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

/**
 * SimPlayer class, allows creation of a functional Player object without affecting the game
 */
class SimPlayer extends Player {
    _slayercoins: any;
    activeAstrologyModifiers: any;
    activeDOTs: any;
    activeItemSynergies: any;
    // @ts-expect-error HACK
    activePrayers: any;
    activeSummonSlots: any;
    applyModifiersToPrayerCost: any;
    // @ts-expect-error HACK
    attackStyle: any;
    attackType: any;
    autoEatTier!: number;
    canAurora: any;
    canCurse: any;
    chargesUsed: any;
    combinations: any;
    cookingMastery: any;
    cookingPool: any;
    course: any;
    courseMastery: any;
    currentGamemodeID: any;
    dataNames: any;
    eatFood: any;
    emptyAutoHeal: any;
    //// @ts-expect-error HACK
    // equipment: any;
    // equipmentSets: any;
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
    // @ts-expect-error Force SimManager type
    manager: SimManager;
    petRolls: any;
    petUnlocked!: Pet[];
    pillar: any;
    potion: PotionItem | null;
    potionSelected!: boolean;
    potionTier!: number;
    runesProvided: any;
    skillLevel: any;
    skillXP: Map<string, number>;
    slayercoins: any;
    // @ts-expect-error HACK
    spellSelection: any;
    summoningSynergy: any;
    target: any;
    timers: any;
    useCombinationRunesFlag: any;
    usedAmmo: number;
    usedFood: number;
    usedPotionCharges: number;
    usedPrayerPoints: number;
    usedRunes: any;
    // @ts-expect-error HACK
    usingAncient: any;
    activeSummoningSynergy: any;
    micsr: MICSR;

    constructor(simManager: SimManager, simGame: SimGame) {
        super(simManager as any, simGame as any);
        this.micsr = simManager.micsr;
        // this.manager = simManager;
        this.usedFood = 0;
        this.gp = 0;
        this.skillXP = new Map(
            this.game.skills.allObjects.map((skill) => [skill.id, skill.xp])
        );
        this.petRolls = {};
        this._slayercoins = 0;
        this.usedAmmo = 0;
        this.usedFood = 0;
        this.usedRunes = {};
        this.potion = null;
        this.usedPotionCharges = 0;
        this.usedPrayerPoints = 0;
        this.chargesUsed = {
            Summon1: 0,
            Summon2: 0,
        };
        this.highestDamageTaken = 0;
        // remove standard spell selection
        this.spellSelection.standard = undefined;
        // overwrite food consumption
        this.food.consume = (quantity = 1) => {
            this.usedFood += quantity;
        };
        // data names for serialization
        this.dataNames = {
            booleanArrays: ["courseMastery"],
            numberArrays: ["skillLevel", "course"],
            booleans: [
                "potionSelected",
                "summoningSynergy",
                "cookingPool",
                "cookingMastery",
                "useCombinationRunesFlag",
                "healAfterDeath",
                "isManualEating",
                "isSlayerTask",
                "hasRunes",
            ],
            numbers: [
                "pillar",
                "potionTier",
                "potionID",
                "autoEatTier",
                "activeAstrologyModifiers", // this is an array of dictionaries, but it (de)serializes fine
            ],
            strings: ["currentGamemodeID"],
        };
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
        return this.gamemode.combatTriangle;
    }

    get useCombinationRunes() {
        return this.useCombinationRunesFlag;
    }

    set useCombinationRunes(useCombinationRunes) {
        this.useCombinationRunesFlag = useCombinationRunes;
    }

    get gamemode() {
        return this.manager.game.gamemodes.getObjectByID(
            this.currentGamemodeID
        );
    }

    get allowRegen() {
        return this.gamemode.hasRegen;
    }

    get synergyDescription() {
        const synergy = this.equippedSummoningSynergy;
        if (synergy !== undefined) {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (this.isSynergyActive(synergy)) {
                return synergy.langDescription;
            } else {
                return getLangString("MENU_TEXT", "LOCKED");
            }
        } else {
            return "";
        }
    }

    get equippedSummoningSynergy() {
        return this.getSynergyData(
            this.equipment.slots.Summon1.item.id,
            this.equipment.slots.Summon2.item.id
        );
    }

    static newFromPlayerString(manager: SimManager, playerString: string) {
        const reader = new SaveWriter("Read", 1);
        reader.setDataFromSaveString(playerString);
        // reader.setRawData(playerString)
        const newSimPlayer = new SimPlayer(manager, manager.micsr.game);
        newSimPlayer.decode(reader, manager.micsr.currentSaveVersion);
        return newSimPlayer;
    }

    initForWebWorker() {
        numberMultiplier = this.gamemode.hitpointMultiplier;
        // recompute stats
        this.updateForEquipmentChange();
        this.resetGains();
    }

    // detach globals attached by parent constructor
    detachGlobals() {
        this._splashManager = {
            add: () => {},
        };
        this._effectRenderer = {
            queueRemoval: () => {},
            queueRemoveAll: () => {},
            removeEffects: () => {},
            addStun: () => {},
            addSleep: () => {},
            addCurse: () => {},
            addDOT: () => {},
            addReflexive: () => {},
            addStacking: () => {},
            addModifier: () => {},
        };
        this._statElements = undefined;
        this._attackBar = undefined;
        this._summonBar = undefined;
    }

    addItemStat() {}

    trackPrayerStats() {}

    trackWeaponStat() {}

    setCallbacks() {}

    processDeath() {
        // @ts-ignore
        this.removeAllEffects(true);
        // @ts-ignore
        this.setHitpoints(Math.floor(this.stats.maxHitpoints * 0.2));
        // heal after death if required
        while (
            this.healAfterDeath &&
            this.hitpoints < this.stats.maxHitpoints &&
            this.food.currentSlot.quantity > 0
        ) {
            this.eatFood();
        }
    }

    // replace globals with properties
    replaceGlobals() {
        // skillLevel
        this.skillLevel = this.micsr.skillNames.map((_: any) => 1);
        this.skillLevel[this.micsr.skillIDs.Hitpoints] = 10;
        // currentGamemode, numberMultiplier
        this.currentGamemodeID = this.micsr.game.currentGamemode.id;
        // petUnlocked
        this.petUnlocked = [];
        // chosenAgilityObstacles, agility MASTERY, agilityPassivePillarActive
        this.course = Array(10).fill(-1);
        this.courseMastery = Array(10).fill(false);
        this.pillar = -1;
        // herbloreBonuses
        this.potionSelected = false;
        this.potionTier = 0;
        this.potion = null;
        // isSynergyUnlocked
        this.summoningSynergy = true;
        // shopItemsPurchased
        this.autoEatTier = -1;
        // cooking MASTERY
        this.cookingPool = false;
        this.cookingMastery = false;
        // useCombinationRunes
        this.useCombinationRunesFlag = false;
        this.combinations = this.micsr.items
            .filter((x: any) => x.type === "Rune" && x.providesRune)
            .map((x: any) => x.id);
        // other
        this.healAfterDeath = true;
        this.isSlayerTask = false;
        this.isManualEating = false;
        this.resetGains();
        // activeAstrologyModifiers
        this.activeAstrologyModifiers = [];
        // runes in bank
        this.hasRunes = true;
    }

    rollForSummoningMarks() {}

    resetGains() {
        this.gp = 0;
        this.skillXP = new Map(
            this.game.skills.allObjects.map((skill) => [skill.id, skill.xp])
        );
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
        const autoHealAmt = Math.floor(
            (this.getFoodHealing(this.food.currentSlot.item) *
                this.autoEatEfficiency) /
                100
        );
        this.emptyAutoHeal = this.autoEatThreshold > 0 && autoHealAmt === 0;
        this.hitpoints = this.stats.maxHitpoints;
    }

    getGainsPerSecond(ticks: any): ISimGains {
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
        let usedSummoningCharges =
            this.chargesUsed.Summon1 + this.chargesUsed.Summon2;
        if (this.chargesUsed.Summon1 > 0 && this.chargesUsed.Summon2 > 0) {
            usedSummoningCharges /= 2;
        }
        // debugger;
        const skillGain = this.game.skills.allObjects.map((skill) => {
            const start = this.skillXP.get(skill.id) || 0;
            return (skill.xp - start) / seconds;
        });
        return {
            gp: this.gp / seconds,
            skillXP: skillGain,
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

    // TODO: Is this correct? used to be tick
    activeTick() {
        super.activeTick();
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
        if (enemy.nextAction !== "Attack") {
            return;
        }
        // number of ticks until the enemy attacks
        const tLeft = enemy.timers.act.ticksLeft;
        if (tLeft < 0) {
            return;
        }
        // max hit of the enemy attack + max dotDamage
        // TODO: this could be handled more efficiently, consider when the different attacks will hit
        const maxDamage =
            enemy.getAttackMaxDamage(enemy.nextAttack) + dotDamage;
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
            if (dot.type === "Regen") {
                return;
            }
            dotDamage += dot.damage;
        });
        return dotDamage;
    }

    addSlayerCoins(amount: any) {
        amount = applyModifier(
            amount,
            this.modifiers.increasedSlayerCoins -
                this.modifiers.decreasedSlayerCoins,
            0
        );
        this._slayercoins += amount;
    }

    addGP(amount: any) {
        this.gp += amount;
    }

    // addXP(skill: any, amount: any) {
    //     this.skillXP[skill] += this.getSkillXPToAdd(skill, amount);
    // }

    // addPetModifiers() {
    //     this.micsr.pets.allObjects.forEach((pet: any, i: any) => {
    //         if (this.petUnlocked[pet.id] && !pet.activeInRaid && pet.modifiers !== undefined) {
    //             this.modifiers.addModifiers(pet.modifiers);
    //         }
    //     });
    // }

    // addAgilityModifiers() {
    //     Util.addAgilityModifiers(this.course, this.courseMastery, this.pillar, this.modifiers);
    // }

    // addAstrologyModifiers() {
    //     for (let i = 0; i < this.activeAstrologyModifiers.length; i++) {
    //         this.modifiers.addModifiers(this.activeAstrologyModifiers[i]);
    //     }
    // }

    // addMiscModifiers() {
    //     // Knight's Defender
    //     if (this.equipment.checkForItemID("melvorF:Knights_Defender" /* ItemIDs.Knights_Defender */) && this.attackType === 'melee') {
    //         this.modifiers.addModifiers({
    //             decreasedAttackInterval: 100,
    //             decreasedDamageReduction: 3,
    //         });
    //     }
    //     if (this.modifiers.increasedNonMagicPoisonChance > 0 && this.attackType !== 'magic') {
    //         this.modifiers.addModifiers({
    //             increasedChanceToApplyPoison: this.modifiers.increasedNonMagicPoisonChance,
    //         });
    //     }
    // }

    // addShopModifiers() {
    //     // auto eat modifiers
    //     for (let tier = 0; tier <= this.autoEatTier; tier++) {
    //         // @ts-expect-error TS(2304): Cannot find name 'SHOP'.
    //         this.modifiers.addModifiers(SHOP.General[1 + tier].contains.modifiers);
    //     }

    //     // other shop modifiers are not relevant for combat sim at this point
    // }

    equipmentID(slotID: any) {
        return this.equipment.slotArray[slotID].item.id;
    }

    // equipmentIDs() {
    //     return this.equipment.slotArray.map((x: any) => x.item.id);
    // }

    equipmentOccupiedBy(slotID: any) {
        return this.equipment.slotArray[slotID].occupiedBy;
    }

    // getSkillXPToAdd(skill: any, xp: any) {
    //     let xpMultiplier = 1;
    //     xpMultiplier += this.modifiers.getSkillModifierValue("increasedSkillXP", skill) / 100;
    //     xpMultiplier -= this.modifiers.getSkillModifierValue("decreasedSkillXP", skill) / 100;
    //     xpMultiplier += (this.modifiers.increasedGlobalSkillXP - this.modifiers.decreasedGlobalSkillXP) / 100;
    //     return xp * xpMultiplier;
    // }

    getExperienceGainSkills(): AnySkill[] {
        // debugger;
        return super.getExperienceGainSkills();
    }

    protected rewardXPAndPetsForDamage(damage: number): void {
        // debugger;
        super.rewardXPAndPetsForDamage(damage);
    }

    // rewardXPAndPetsForDamage(damage: number) {
    //     damage = damage / numberMultiplier;
    //     const attackInterval = this.timers.act.maxTicks * TICK_INTERVAL;
    //     // Combat Style
    //     if (this.attackStyle !== undefined) {
    //         this.attackStyle.experienceGain.forEach((gain: any) => {
    //             gain.skill.addXP(gain.ratio * damage);
    //         });
    //     }
    //     // Hitpoints
    //     this.addXP(this.micsr.skillIDs.Hitpoints, damage * 1.33);
    //     // Prayer
    //     let prayerRatio = 0;
    //     this.activePrayers.forEach((prayer: any) => {
    //         return (prayerRatio += prayer.pointsPerPlayer);
    //     });
    //     prayerRatio /= 3;
    //     if (prayerRatio > 0) {
    //         this.addXP(this.micsr.skillIDs.Prayer, prayerRatio * damage);
    //     }
    //     // TODO summoning marks
    //     // pets
    //     this.petRolls[attackInterval] = 1 + (this.petRolls[attackInterval] | 0);
    // }

    // get skill level from property instead of global `skillLevel`
    getSkillLevel(skillID: any) {
        return Math.min(99, this.skillLevel[skillID]);
    }

    // don't render anything
    setRenderAll() {}

    render() {}

    // track potion usage instead of consuming
    consumePotionCharge(type: any) {
        if (this.potionSelected) {
            const item = this.potion;
            if (
                // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                type === Herblore.potions[item.masteryID[1]].consumesOn &&
                !rollPercentage(
                    this.modifiers.increasedChanceToPreservePotionCharge -
                        this.modifiers.decreasedChanceToPreservePotionCharge
                )
            ) {
                this.usedPotionCharges++;
            }
        }
    }

    reusePotion() {}

    // addPotionModifiers() {
    //     if (this.potionSelected) {
    //         const item = this.getPotion();
    //         if (item.modifiers !== undefined) {
    //             this.modifiers.addModifiers(item.modifiers);
    //         }
    //     }
    // }

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
            const reducedCost =
                cost.qty - (this.runesProvided.get(cost.id) | 0);
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
        if (!rollPercentage(this.modifiers.runePreservationChance)) {
            costs.forEach((cost: any) => {
                if (this.usedRunes[cost.itemID] === undefined) {
                    this.usedRunes[cost.itemID] = 0;
                }
                this.usedRunes[cost.itemID] += cost.qty;
            });
        }
    }

    onMagicAttackFailure() {}

    updateForEquipmentChange() {
        // @ts-ignore
        this.computeAllStats();
        this.interruptAttack();
        if (this.manager.fightInProgress) {
            this.target.combatModifierUpdate();
        }
    }

    equipItem(
        item: EquipmentItem,
        set: number,
        slot?: SlotTypes | "Default",
        quantity?: number
    ): boolean {
        const itemToEquip =
            item === undefined ? this.micsr.emptyItems[slot] : item;
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
        return true;
    }

    protected unequipItem(set: number, slot: SlotTypes): boolean {
        this.equipment.unequipItem(slot);
        this.updateForEquipmentChange();
        return true;
    }

    equipFood(item: FoodItem, quantity: number): boolean | undefined {
        if (item.id === "melvorD:Empty_Equipment") {
            this.unequipFood();
            return;
        }
        // Unequip previous food
        this.food.unequipSelected();
        // Proceed to equip the food
        this.food.equip(item, Number.MAX_SAFE_INTEGER);
    }

    unequipFood() {
        this.food.unequipSelected();
    }

    getFoodHealingBonus(item: any) {
        let bonus =
            this.modifiers.increasedFoodHealingValue -
            this.modifiers.decreasedFoodHealingValue;
        if (item.cookingID !== undefined && this.cookingMastery) {
            bonus += 20;
        }
        if (this.cookingPool) {
            bonus += 10;
        }
        return bonus;
    }

    computeSummoningSynergy() {
        this.activeSummoningSynergy = this.getUnlockedSynergyData(
            this.equipment.slots.Summon1.item,
            this.equipment.slots.Summon2.item
        );
    }

    getSynergyData(summon1: any, summon2: any) {
        let _a;
        return (_a = this.micsr.game.summoning.synergiesByItem.get(summon1)) ===
            null || _a === void 0
            ? void 0
            : _a.get(summon2);
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
        if (this.activeSummonSlots.length < 2) return false;
        return (
            this.getUnlockedSynergyData(
                this.equipment.slots[this.activeSummonSlots[0]].item.id,
                this.equipment.slots[this.activeSummonSlots[1]].item.id
            ) !== undefined
        );
    }

    isSynergyActive(summonID1: any, summonID2: any) {
        if (!this.summoningSynergy) {
            return false;
        }
        // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
        const itemID1 = Summoning.marks[summonID1].itemID;
        // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
        const itemID2 = Summoning.marks[summonID2].itemID;
        return (
            this.getUnlockedSynergyData(itemID1, itemID2) !== undefined &&
            this.equipment.checkForItemID(itemID1) &&
            this.equipment.checkForItemID(itemID2)
        );
    }

    removeSummonCharge(slot: any, charges = 1) {
        if (
            !rollPercentage(
                this.modifiers.increasedSummoningChargePreservation -
                    this.modifiers.decreasedSummoningChargePreservation
            )
        ) {
            this.chargesUsed[slot] += charges;
        }
    }

    // don't disable selected spells
    checkMagicUsage() {
        const allowMagic =
            this.attackType === "magic" ||
            this.modifiers.allowAttackAugmentingMagic > 0;
        this.canAurora = allowMagic;
        this.canCurse = allowMagic && !this.usingAncient;
    }

    rollToHit(target: any, attack: any) {
        return (
            this.checkRequirements(this.manager.areaRequirements) &&
            super.rollToHit(target, attack)
        );
    }

    damage(amount: any, source: any, thieving = false) {
        super.damage(amount, source);
        this.highestDamageTaken = Math.max(this.highestDamageTaken, amount);
        if (this.hitpoints > 0) {
            if (
                this.hitpoints <
                (this.stats.maxHitpoints *
                    this.modifiers.increasedCombatStoppingThreshold) /
                    100
            ) {
                this.manager.stopCombat();
            }
            this.lowestHitpoints = Math.min(
                this.lowestHitpoints,
                this.hitpoints
            );
        }
    }

    autoEat() {
        if (this.emptyAutoHeal) {
            this.usedFood = Number.MAX_SAFE_INTEGER;
        } else {
            super.autoEat();
        }
    }

    checkRequirements(
        reqs: any,
        notifyOnFailure = false,
        failureMessage = "do that."
    ) {
        return reqs.every((req: any) =>
            this.checkRequirement(req, notifyOnFailure, failureMessage)
        );
    }

    checkRequirement(
        requirement: any,
        notifyOnFailure = false,
        failureMessage = "do that."
    ) {
        let met = false;
        switch (requirement.type) {
            case "Level":
                met = requirement.levels.every(
                    (levelReq: any) =>
                        this.skillLevel[levelReq.skill] >= levelReq.level
                );
                break;
            case "Dungeon":
                met = true;
                break;
            case "Completion":
                met = true;
                break;
            case "SlayerItem":
                met =
                    this.modifiers.bypassSlayerItems > 0 ||
                    this.equipment.checkForItemID(requirement.itemID);
                break;
            case "ShopPurchase":
                met = true;
                break;
        }
        return met;
    }

    hasKey<O extends object>(obj: O, key: PropertyKey): key is keyof O {
        return key in obj;
    }

    /** Encode the SimPlayer object */
    // encode(writer: any) {
    //     return super.encode(writer);
    //     // this.dataNames.booleanArrays.forEach((x: PropertyKey) => {
    //     //     // console.log('encode boolean array', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         writer.writeArray(this[x], (object: any, writer: any) => writer.writeBoolean(object));
    //     //     }
    //     // });
    //     // this.dataNames.numberArrays.forEach((x: PropertyKey) => {
    //     //     // console.log('encode boolean array', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         writer.writeArray(this[x], (object: any, writer: any) => writer.writeInt32(object));
    //     //     }
    //     // });
    //     // this.dataNames.booleans.forEach((x: PropertyKey) => {
    //     //     // console.log('encode boolean', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         writer.writeBoolean(this[x]);
    //     //     }
    //     // });
    //     // this.dataNames.numbers.forEach((x: PropertyKey) => {
    //     //     // console.log('encode number', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         writer.writeInt32(this[x]);
    //     //     }
    //     // });
    //     // this.dataNames.strings.forEach((x: PropertyKey) => {
    //     //     // console.log('encode string', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         writer.writeString(this[x]);
    //     //     }
    //     // });
    //     // return writer.data;
    // }

    /** Decode the SimPlayer object */
    // decode(reader: any, version: any = this.micsr.currentSaveVersion) {
    //     super.decode(reader, version);
    //     // this.dataNames.booleanArrays.forEach((x: PropertyKey) => {
    //     //     // console.log('decode boolean array', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         this[x] = reader.getArray((reader: any) => reader.getBoolean());
    //     //         // console.log(this[x]);
    //     //     }
    //     // });
    //     // this.dataNames.numberArrays.forEach((x: PropertyKey) => {
    //     //     // console.log('decode number array', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         this[x] = reader.getArray((reader: any) => reader.getInt32());
    //     //         // console.log(this[x]);
    //     //     }
    //     // });
    //     // this.dataNames.booleans.forEach((x: PropertyKey) => {
    //     //     // console.log('decode boolean', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         this[x] = reader.getBoolean();
    //     //         // console.log(this[x]);
    //     //     }
    //     // });
    //     // this.dataNames.numbers.forEach((x: PropertyKey) => {
    //     //     // console.log('decode number', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         this[x] = reader.getInt32();
    //     //         // console.log(this[x]);
    //     //     }
    //     // });
    //     // this.dataNames.strings.forEach((x: PropertyKey) => {
    //     //     // console.log('decode string', x)
    //     //     if (this.hasKey(this, x)) {
    //     //         this[x] = reader.getString();
    //     //         // console.log(this[x]);
    //     //     }
    //     // });
    //     // after reading the data, recompute stats and reset gains
    //     super.computeAllStats();
    //     this.resetGains();
    // }

    // generatePlayerString() {
    //     const micsrPlayerHeader = () => this.micsr.actualGame.getSaveHeader()
    //     const writer = new SaveWriter('Write', 512);
    //     this.encode(writer);
    //     return this.getSaveString(writer, micsrPlayerHeader());
    // }

    // getSaveString(w: any, headerInfo: any) {
    //     // Save namespace mapping as an array, as it is ordered
    //     w.header.writeMap(w.namespaceMap, (namespace: any, writer: any) => {
    //         writer.writeString(namespace);
    //     }, (idMap: any, writer: any) => {
    //         writer.writeMap(idMap, (localID: any, writer: any) => {
    //             writer.writeString(localID);
    //         }, (numericID: any, writer: any) => {
    //             writer.writeUint16(numericID);
    //         });
    //     });
    //     w.writeHeaderInfo(headerInfo);
    //     // Combine header and namespace data
    //     const headerData = w.header.getRawData();
    //     const bodyData = w.getRawData();
    //     const combinedData = new BinaryWriter('Write', headerData.byteLength + bodyData.byteLength);
    //     combinedData.writeFixedLengthBuffer(w.stringEncoder.encode('melvor'), 6);
    //     combinedData.writeBuffer(headerData);
    //     combinedData.writeBuffer(bodyData);
    //     const rawSaveData = combinedData.getRawData();
    //     const compressedData = new Uint8Array(rawSaveData);
    //     console.log('sent', compressedData)
    //     return compressedData;/*
    //             const decoder = new TextDecoder('utf8');
    //             console.log(1, compressedData)
    //             console.log(2, decoder.decode(compressedData))
    //             const saveString = btoa(unescape(encodeURIComponent(decoder.decode(compressedData))));
    //             // console.log(`Compressed: ${compressedData.length} bytes. Save String: ${saveString.length} bytes`);
    //             return saveString;*/
    // }

    static generatePlayerString(game: SimGame, player: SimPlayer) {
        // const gameString = game.generateSaveString();
        // const header = await game.getHeaderFromSaveString(gameString);
        const header = game.getSaveHeader();
        const writer = new SaveWriter("Write", 512);
        // writer.writeHeaderInfo()
        player.encode(writer);
        return writer.getSaveString(header);
    }

    // static getSaveString(w: SaveWriter, headerInfo: any) {
    //     // Save namespace mapping as an array, as it is ordered
    //     w.header.writeMap(w.namespaceMap, (namespace: any, writer: any) => {
    //         writer.writeString(namespace);
    //     }, (idMap: any, writer: any) => {
    //         writer.writeMap(idMap, (localID: any, writer: any) => {
    //             writer.writeString(localID);
    //         }, (numericID: any, writer: any) => {
    //             writer.writeUint16(numericID);
    //         });
    //     });
    //     w.writeHeaderInfo(headerInfo);
    //     // Combine header and namespace data
    //     const headerData = w.header.getRawData();
    //     const bodyData = w.getRawData();
    //     const combinedData = new BinaryWriter('Write', headerData.byteLength + bodyData.byteLength);
    //     combinedData.writeFixedLengthBuffer(w.stringEncoder.encode('melvor'), 6);
    //     combinedData.writeBuffer(headerData);
    //     combinedData.writeBuffer(bodyData);
    //     // return combinedData.();
    //     const rawSaveData = combinedData.getRawData();
    //     const compressedData = new Uint8Array(rawSaveData);
    //     // // console.log('sent', compressedData)
    //     // // return compressedData;
    //     const decoder = new TextDecoder('utf8');
    //     // // console.log(1, compressedData)
    //     // // console.log(2, decoder.decode(compressedData))
    //     const saveString = btoa(unescape(encodeURIComponent(decoder.decode(compressedData))));
    //     // // console.log(`Compressed: ${compressedData.length} bytes. Save String: ${saveString.length} bytes`);
    //     return saveString;
    // }
}
