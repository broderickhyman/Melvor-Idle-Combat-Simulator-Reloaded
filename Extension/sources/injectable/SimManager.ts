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

        // overwrite CombatLoot
        // @ts-expect-error TS(2304): Cannot find name 'CombatLoot'.
        CombatLoot = class {
            add() {
            }

            removeAll() {
            }
        }

        // overwrite SlayerTask
        // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
        const slayerTaskData = SlayerTask.data;
        // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
        SlayerTask = class {
            tick() {
            }
        }
        // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
        SlayerTask.data = slayerTaskData;

        /**
         * SimManager class, allows creation of a functional Player object without affecting the game
         */
        // @ts-expect-error TS(2304): Cannot find name 'CombatManager'.
        MICSR.SimManager = class extends CombatManager {
            areaData: any;
            areaType: any;
            bank: any;
            dropEnemyGP: any;
            dungeonProgress: any;
            endFight: any;
            enemy: any;
            isInCombat: any;
            loadNextEnemy: any;
            loot: any;
            paused: any;
            player: any;
            renderCombat: any;
            selectedMonster: any;
            simStats: any;
            spawnTimer: any;
            startFight: any;
            tick: any;
            tickCount: any;
            constructor() {
                super();
                this.player = new MICSR.SimPlayer(this);
                // @ts-expect-error TS(2304): Cannot find name 'MONSTERS'.
                this.enemy = new MICSR.SimEnemy(MONSTERS[0], this);
                this.detachGlobals();
                this.replaceGlobals();
            }

            initialize() {
                super.initialize();
                this.renderCombat = false;
            }

            // detach globals attached by parent constructor
            detachGlobals() {
                this.bank = {
                    addItem: () => true,
                    checkForItems: (costs: any) => {
                        // @ts-expect-error TS(2304): Cannot find name 'items'.
                        if (costs.find((x: any) => items[x.itemID].type === "Rune") !== undefined) {
                            return this.player.hasRunes;
                        }
                        return true;
                    },
                    consumeItems: () => {
                    },
                    getQty: () => 1e6,
                };
            }

            addItemStat() {
            }

            addMonsterStat() {
            }

            addCombatStat() {
            }

            setCallbacks() {
            }

            // replace globals with properties
            replaceGlobals() {
                this.resetSimStats();
            }

            // don't render anything
            render() {
            }

            // create new Sim Enemy
            createNewEnemy() {
                // @ts-expect-error TS(2304): Cannot find name 'MONSTERS'.
                this.enemy = new MICSR.SimEnemy(MONSTERS[this.selectedMonster], this);
                // @ts-expect-error TS(2304): Cannot find name 'DUNGEONS'.
                this.enemy.isAfflicted = (this.areaData === DUNGEONS[Dungeons.Into_the_Mist]);
            }

            // reset sim stats
            resetSimStats() {
                this.tickCount = 0;
                this.simStats = {
                    killCount: 0,
                    deathCount: 0,
                }
                // process death, this will consume food or put you at 20% HP
                this.player.processDeath();
                // reset gains, this includes resetting food usage and setting player to 100% HP
                this.player.resetGains();
            }

            getSimStats(dungeonID: any, success: any) {
                return {
                    success: success,
                    monsterID: this.selectedMonster,
                    dungeonID: dungeonID,
                    tickCount: this.tickCount,
                    ...this.simStats,
                    gainsPerSecond: this.player.getGainsPerSecond(this.tickCount),
                };
            }

            convertSlowSimToResult(simResult: any, targetTrials: any) {
                const data = {};
                const gps = simResult.gainsPerSecond;
                // @ts-expect-error TS(2304): Cannot find name 'TICK_INTERVAL'.
                const ticksPerSecond = 1000 / TICK_INTERVAL;
                const trials = simResult.killCount + simResult.deathCount;
                // success
(data as any).simSuccess = simResult.success;
                (data as any).reason = undefined;
                (data as any).tickCount = simResult.tickCount;
                // xp rates
// @ts-expect-error TS(2304): Cannot find name 'Skills'.
(data as any).xpPerSecond = gps.skillXP[Skills.Attack]
    // @ts-expect-error TS(2304): Cannot find name 'Skills'.
    + gps.skillXP[Skills.Strength]
    // @ts-expect-error TS(2304): Cannot find name 'Skills'.
    + gps.skillXP[Skills.Defence]
    // @ts-expect-error TS(2304): Cannot find name 'Skills'.
    + gps.skillXP[Skills.Ranged]
    // @ts-expect-error TS(2304): Cannot find name 'Skills'.
    + gps.skillXP[Skills.Magic]; // TODO: this depends on attack style
 // @ts-expect-error TS(2304): Cannot find name 'Skills'.
 (data as any).hpXpPerSecond = gps.skillXP[Skills.Hitpoints];
                // @ts-expect-error TS(2304): Cannot find name 'Skills'.
                (data as any).slayerXpPerSecond = gps.skillXP[Skills.Slayer];
                // @ts-expect-error TS(2304): Cannot find name 'Skills'.
                (data as any).prayerXpPerSecond = gps.skillXP[Skills.Prayer];
                // @ts-expect-error TS(2304): Cannot find name 'Skills'.
                (data as any).summoningXpPerSecond = gps.skillXP[Skills.Summoning];
                // consumables
(data as any).ppConsumedPerSecond = gps.usedPrayerPoints;
                (data as any).ammoUsedPerSecond = gps.usedAmmo;
                (data as any).runesUsedPerSecond = gps.usedRunes;
                (data as any).usedRunesBreakdown = gps.usedRunesBreakdown;
                (data as any).combinationRunesUsedPerSecond = gps.usedCombinationRunes;
                let potionCharges = 1;
                if (this.player.potionID > -1) {
                    // @ts-expect-error TS(2304): Cannot find name 'items'.
                    const potion = items[Herblore.potions[this.player.potionID].potionIDs[this.player.potionTier]];
                    potionCharges = potion.potionCharges + MICSR.getModifierValue(this.player.modifiers, 'PotionChargesFlat');
                }
                (data as any).potionsUsedPerSecond = gps.usedPotionCharges / potionCharges; // TODO: divide by potion capacity
 (data as any).tabletsUsedPerSecond = gps.usedSummoningCharges;
                (data as any).atePerSecond = gps.usedFood;
                // survivability
(data as any).deathRate = simResult.deathCount / trials;
                (data as any).highestDamageTaken = gps.highestDamageTaken;
                (data as any).lowestHitpoints = gps.lowestHitpoints;
                // kill time
(data as any).killTimeS = simResult.tickCount / ticksPerSecond / simResult.killCount;
                (data as any).killsPerSecond = 1 / (data as any).killTimeS;
                // loot gains
(data as any).baseGpPerSecond = gps.gp; // gpPerSecond is computed from this
 (data as any).dropChance = NaN;
                (data as any).signetChance = NaN;
                (data as any).petChance = NaN;
                (data as any).petRolls = gps.petRolls;
                (data as any).slayerCoinsPerSecond = gps.slayercoins;
                // not displayed -> TODO: remove?
(data as any).simulationTime = NaN;
                if (targetTrials - trials > 0) {
                    (data as any).reason = `simulated ${trials}/${targetTrials} trials`;
                }
                return data;
            }

            // track kills and deaths
            onPlayerDeath() {
                this.player.processDeath();
                this.simStats.deathCount++;
            }

            onEnemyDeath() {
                this.player.rewardGPForKill();
                if (this.areaData.type === 'Dungeon') {
                    this.progressDungeon();
                } else {
                    this.rewardForEnemyDeath();
                }
                // from baseManager
                this.enemy.processDeath();
                this.simStats.killCount++;
            }

            progressDungeon() {
                // do not progress the dungeon!
                if (this.areaData.dropBones) {
                    this.dropEnemyBones();
                }
                // check if we killed the last monster (length - 1 since we do not increase the progress!)
                if (this.dungeonProgress === this.areaData.monsters.length - 1) {
                    this.dropEnemyGP();
                    // TODO: roll for dungeon pets?
                    // TODO: add bonus coal on dungeon completion?
                }
            }

            dropSignetHalfB() {
            }

            dropEnemyBones() {
            }

            dropEnemyLoot() {
            }

            rewardForEnemyDeath() {
                this.dropEnemyBones();
                this.dropSignetHalfB();
                this.dropEnemyLoot();
                this.dropEnemyGP();
                let slayerXPReward = 0;
                if (this.areaType === 'Slayer') {
                    // @ts-expect-error TS(2304): Cannot find name 'numberMultiplier'.
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier / 2;
                }
                if (this.onSlayerTask) {
                    this.player.rewardSlayerCoins();
                    // @ts-expect-error TS(2304): Cannot find name 'numberMultiplier'.
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier;
                }
                if (slayerXPReward > 0)
                    // @ts-expect-error TS(2304): Cannot find name 'Skills'.
                    this.player.addXP(Skills.Slayer, slayerXPReward);
            }

            selectMonster(monsterID: any, areaData: any) {
                if (!this.player.checkRequirements(areaData.entryRequirements, true, 'fight this monster.')) {
                    return;
                }
                this.preSelection();
                this.areaType = areaData.type;
                this.areaData = areaData;
                this.selectedMonster = monsterID;
                this.onSelection();
            }

            preSelection() {
                this.stopCombat(true, true);
            }

            onSelection() {
                this.isInCombat = true;
                this.loadNextEnemy();
            }

            stopCombat(fled = true, areaChange = false) {
                this.isInCombat = false;
                this.endFight();
                if (this.spawnTimer.isActive)
                    this.spawnTimer.stop();
                if (this.enemy.state !== "Dead")
                    this.enemy.processDeath();
                this.loot.removeAll();
                this.areaType = 'None';
                if (this.paused) {
                    this.paused = false;
                }
            }

            pauseDungeon() {
                this.paused = true;
            }

            resumeDungeon() {
                this.startFight();
                this.paused = false;
            }

            runTrials(monsterID: any, dungeonID: any, trials: any, tickLimit: any, verbose = false) {
                this.resetSimStats();
                const startTimeStamp = performance.now();
                // @ts-expect-error TS(2304): Cannot find name 'getMonsterArea'.
                let areaData = getMonsterArea(monsterID);
                if (dungeonID !== undefined) {
                    // @ts-expect-error TS(2304): Cannot find name 'DUNGEONS'.
                    areaData = DUNGEONS[dungeonID];
                    this.dungeonProgress = 0;
                    while (areaData.monsters[this.dungeonProgress] !== monsterID) {
                        this.dungeonProgress++;
                    }
                }
                const totalTickLimit = trials * tickLimit;
                const success = this.player.checkRequirements(areaData.entryRequirements, true, 'fight this monster.');
                if (success) {
                    this.selectMonster(monsterID, areaData);
                    while (this.simStats.killCount + this.simStats.deathCount < trials && this.tickCount < totalTickLimit) {
                        if (!this.isInCombat && !this.spawnTimer.active) {
                            this.selectMonster(monsterID, areaData);
                        }
                        if (this.paused) {
                            this.resumeDungeon();
                        }
                        this.tick();
                    }
                }
                this.stopCombat();
                const processingTime = performance.now() - startTimeStamp;
                const simResult = this.getSimStats(dungeonID, success);
                if (verbose) {
                    MICSR.log(`Processed ${this.simStats.killCount} / ${this.simStats.deathCount} k/d and ${this.tickCount} ticks in ${processingTime / 1000}s (${processingTime / this.tickCount}ms/tick).`, simResult);
                }
                return simResult;
            }

            get onSlayerTask() {
                return this.player.isSlayerTask && this.areaType !== 'Dungeon' && this.areaType !== 'None';
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
        if (characterSelected && !characterLoading) {
            loadCounter++;
        }
        if (loadCounter > 100) {
            console.log('Failed to load ' + id);
            return;
        }
        // check requirements
        // @ts-expect-error TS(2304): Cannot find name 'characterSelected'.
        let reqMet = characterSelected && !characterLoading;
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
    waitLoadOrder(reqs, setup, 'SimManager');

})();