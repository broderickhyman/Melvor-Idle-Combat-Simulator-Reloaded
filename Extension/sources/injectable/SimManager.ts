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

        // overwrite CombatLoot
        CombatLoot = class {
            add() {
            }

            removeAll() {
            }
        }

        // overwrite SlayerTask
        const slayerTaskData = SlayerTask.data;
        SlayerTask = class {
            tick() {
            }
        }
        SlayerTask.data = slayerTaskData;

        /**
         * SimManager class, allows creation of a functional Player object without affecting the game
         */
        MICSR.SimManager = class extends CombatManager {
            constructor() {
                super();
                this.player = new MICSR.SimPlayer(this);
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
                    checkForItems: costs => {
                        if (costs.find(x => items[x.itemID].type === "Rune") !== undefined) {
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
                this.enemy = new MICSR.SimEnemy(MONSTERS[this.selectedMonster], this);
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

            getSimStats(dungeonID, success) {
                return {
                    success: success,
                    monsterID: this.selectedMonster,
                    dungeonID: dungeonID,
                    tickCount: this.tickCount,
                    ...this.simStats,
                    gainsPerSecond: this.player.getGainsPerSecond(this.tickCount),
                };
            }

            convertSlowSimToResult(simResult, targetTrials) {
                const data = {};
                const gps = simResult.gainsPerSecond;
                const ticksPerSecond = 1000 / TICK_INTERVAL;
                const trials = simResult.killCount + simResult.deathCount;
                // success
                data.simSuccess = simResult.success;
                data.reason = undefined;
                data.tickCount = simResult.tickCount;
                // xp rates
                data.xpPerSecond = gps.skillXP[Skills.Attack]
                    + gps.skillXP[Skills.Strength]
                    + gps.skillXP[Skills.Defence]
                    + gps.skillXP[Skills.Ranged]
                    + gps.skillXP[Skills.Magic]; // TODO: this depends on attack style
                data.hpXpPerSecond = gps.skillXP[Skills.Hitpoints];
                data.slayerXpPerSecond = gps.skillXP[Skills.Slayer];
                data.prayerXpPerSecond = gps.skillXP[Skills.Prayer];
                data.summoningXpPerSecond = gps.skillXP[Skills.Summoning];
                // consumables
                data.ppConsumedPerSecond = gps.usedPrayerPoints;
                data.ammoUsedPerSecond = gps.usedAmmo;
                data.runesUsedPerSecond = gps.usedRunes;
                data.usedRunesBreakdown = gps.usedRunesBreakdown;
                data.combinationRunesUsedPerSecond = gps.usedCombinationRunes;
                let potionCharges = 1;
                if (this.player.potionID > -1) {
                    const potion = items[Herblore.potions[this.player.potionID].potionIDs[this.player.potionTier]];
                    potionCharges = potion.potionCharges + MICSR.getModifierValue(this.player.modifiers, 'PotionChargesFlat');
                }
                data.potionsUsedPerSecond = gps.usedPotionCharges / potionCharges; // TODO: divide by potion capacity
                data.tabletsUsedPerSecond = gps.usedSummoningCharges;
                data.atePerSecond = gps.usedFood;
                // survivability
                data.deathRate = simResult.deathCount / trials;
                data.highestDamageTaken = gps.highestDamageTaken;
                data.lowestHitpoints = gps.lowestHitpoints;
                // kill time
                data.killTimeS = simResult.tickCount / ticksPerSecond / simResult.killCount;
                data.killsPerSecond = 1 / data.killTimeS;
                // loot gains
                data.baseGpPerSecond = gps.gp; // gpPerSecond is computed from this
                data.dropChance = NaN;
                data.signetChance = NaN;
                data.petChance = NaN;
                data.petRolls = gps.petRolls;
                data.slayerCoinsPerSecond = gps.slayercoins;
                // not displayed -> TODO: remove?
                data.simulationTime = NaN;
                if (targetTrials - trials > 0) {
                    data.reason = `simulated ${trials}/${targetTrials} trials`;
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
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier / 2;
                }
                if (this.onSlayerTask) {
                    this.player.rewardSlayerCoins();
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier;
                }
                if (slayerXPReward > 0)
                    this.player.addXP(Skills.Slayer, slayerXPReward);
            }

            selectMonster(monsterID, areaData) {
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

            runTrials(monsterID, dungeonID, trials, tickLimit, verbose = false) {
                this.resetSimStats();
                const startTimeStamp = performance.now();
                let areaData = getMonsterArea(monsterID);
                if (dungeonID !== undefined) {
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
    waitLoadOrder(reqs, setup, 'SimManager');

})();