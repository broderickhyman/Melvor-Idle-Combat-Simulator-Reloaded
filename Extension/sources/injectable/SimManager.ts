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
         * SimManager class, allows creation of a functional Player object without affecting the game
         */
        MICSR.SimManager = class extends CombatManager {
            selectedArea: any;
            // @ts-expect-error HACK
            areaType: any;
            bank: any;
            dropEnemyGP: any;
            dungeonProgress: any;
            endFight: any;
            enemy: any;
            isActive: any;
            loot: any;
            paused: any;
            player: any;
            renderCombat: any;
            selectedMonster: any;
            simStats: any;
            spawnTimer: any;
            startFight: any;
            tickCount: any;
            game: any;

            constructor(game: any, namespace: any) {
                super(game, namespace);
                this.player = new MICSR.SimPlayer(this, MICSR.game);
                this.enemy = new MICSR.SimEnemy(this, MICSR.game);
                this.detachGlobals();
                this.replaceGlobals();
            }

            get onSlayerTask() {
                return this.player.isSlayerTask && this.areaType !== 'Dungeon' && this.areaType !== 'None';
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
                this.enemy = new MICSR.SimEnemy(this, MICSR.game);
                this.enemy.setMonster(this.selectedMonster);
                // @ts-ignore
                if (this.selectedArea instanceof Dungeon &&
                    this.selectedArea.nonBossPassives !== undefined &&
                    !this.selectedArea.monsters[this.dungeonProgress].isBoss) {
                    this.enemy.addPassives(this.selectedArea.nonBossPassives, true, true, false);
                }
                // @ts-expect-error HACK
                if (super.activeEvent !== undefined) {
                    // @ts-expect-error HACK
                    this.enemy.addPassives(super.eventPassives, true, false, false);
                    // @ts-expect-error HACK
                    if (this.selectedMonster !== super.activeEvent.firstBossMonster &&
                        // @ts-expect-error HACK
                        this.selectedMonster !== super.activeEvent.finalBossMonster) {
                        // @ts-expect-error HACK
                        this.enemy.addPassives(super.activeEvent.enemyPassives, true, true, false);
                    }
                    // @ts-expect-error HACK
                    if (this.dungeonProgress === super.eventDungeonLength - (super.atLastEventDungeon ? 2 : 1)) {
                        // @ts-expect-error HACK
                        this.enemy.addPassives(super.activeEvent.bossPassives, true, true, false);
                        // May want to make this enemy an actual boss monster for big ol ron? idk
                    }
                }
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

            getSimStats(monsterID: string, dungeonID: string, success: any) {
                return {
                    success: success,
                    monsterID: monsterID,
                    dungeonID: dungeonID,
                    tickCount: this.tickCount,
                    ...this.simStats,
                    gainsPerSecond: this.player.getGainsPerSecond(this.tickCount),
                };
            }

            convertSlowSimToResult(simResult: any, targetTrials: any) {
                const gps = simResult.gainsPerSecond;
                const ticksPerSecond = 1000 / TICK_INTERVAL;
                const trials = simResult.killCount + simResult.deathCount;
                let reason = undefined;
                if (targetTrials - trials > 0) {
                    reason = `simulated ${trials}/${targetTrials} trials`;
                }
                const killTimeS = simResult.tickCount / ticksPerSecond / simResult.killCount;
                // compute potion use
                let potionCharges = 1;
                if (this.player.potionID > -1) {
                    // @ts-expect-error TS(2304): Cannot find name 'items'.
                    const potion = items[Herblore.potions[this.player.potionID].potionIDs[this.player.potionTier]];
                    potionCharges = potion.potionCharges + MICSR.getModifierValue(this.player.modifiers, 'PotionChargesFlat');
                }
                return {
                    // success
                    simSuccess: simResult.success,
                    reason: reason,
                    tickCount: simResult.tickCount,
                    // xp rates
                    xpPerSecond: gps.skillXP[MICSR.skillIDs.Attack]
                        + gps.skillXP[MICSR.skillIDs.Strength]
                        + gps.skillXP[MICSR.skillIDs.Defence]
                        + gps.skillXP[MICSR.skillIDs.Ranged]
                        + gps.skillXP[MICSR.skillIDs.Magic], // TODO: this depends on attack style
                    hpXpPerSecond: gps.skillXP[MICSR.skillIDs.Hitpoints],
                    slayerXpPerSecond: gps.skillXP[MICSR.skillIDs.Slayer],
                    prayerXpPerSecond: gps.skillXP[MICSR.skillIDs.Prayer],
                    summoningXpPerSecond: gps.skillXP[MICSR.skillIDs.Summoning],
                    // consumables
                    ppConsumedPerSecond: gps.usedPrayerPoints,
                    ammoUsedPerSecond: gps.usedAmmo,
                    runesUsedPerSecond: gps.usedRunes,
                    usedRunesBreakdown: gps.usedRunesBreakdown,
                    combinationRunesUsedPerSecond: gps.usedCombinationRunes,
                    potionsUsedPerSecond: gps.usedPotionCharges / potionCharges, // TODO: divide by potion capacity
                    tabletsUsedPerSecond: gps.usedSummoningCharges,
                    atePerSecond: gps.usedFood,
                    // survivability
                    deathRate: simResult.deathCount / trials,
                    highestDamageTaken: gps.highestDamageTaken,
                    lowestHitpoints: gps.lowestHitpoints,
                    // kill time
                    killTimeS: killTimeS,
                    killsPerSecond: 1 / killTimeS,
                    // loot gains
                    baseGpPerSecond: gps.gp, // gpPerSecond is computed from this
                    dropChance: NaN,
                    signetChance: NaN,
                    petChance: NaN,
                    petRolls: gps.petRolls,
                    slayerCoinsPerSecond: gps.slayercoins,
                    // not displayed -> TODO: remove?
                    simulationTime: NaN,
                }
            }

            // track kills and deaths
            onPlayerDeath() {
                this.player.processDeath();
                this.simStats.deathCount++;
            }

            // @ts-expect-error HACK
            onEnemyDeath() {
                this.player.rewardGPForKill();
                if (this.selectedArea.type === 'Dungeon') {
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
                if (this.selectedArea.dropBones) {
                    this.dropEnemyBones();
                }
                // check if we killed the last monster (length - 1 since we do not increase the progress!)
                if (this.dungeonProgress === this.selectedArea.monsters.length - 1) {
                    this.dropEnemyGP(this.enemy.monster);
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
                this.dropEnemyGP(this.enemy.monster);
                let slayerXPReward = 0;
                if (this.areaType === 'Slayer') {
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier / 2;
                }
                if (this.onSlayerTask) {
                    this.player.rewardSlayerCoins();
                    slayerXPReward += this.enemy.stats.maxHitpoints / numberMultiplier;
                }
                if (slayerXPReward > 0)
                    this.player.addXP(MICSR.skillIDs.Slayer, slayerXPReward);
            }

            selectMonster(monster: any, areaData: any) {
                // clone of combatManager.selectMonster
                let slayerLevelReq = 0;
                // @ts-ignore
                if (areaData instanceof SlayerArea) {
                    slayerLevelReq = areaData.slayerLevelRequired;
                }
                if (!this.game.checkRequirements(areaData.entryRequirements, true, slayerLevelReq)) {
                    return;
                }
                this.preSelection();
                this.selectedArea = areaData;
                this.selectedMonster = monster;
                this.onSelection();
            }

            // @ts-expect-error HACK
            preSelection() {
                this.stopCombat(true, true);
            }

            loadNextEnemy() {
                super.loadNextEnemy()
            }

            onSelection() {
                this.isActive = true;
                this.loadNextEnemy();
            }

            stopCombat(fled = true, areaChange = false) {
                this.isActive = false;
                this.endFight();
                if (this.spawnTimer.isActive)
                    this.spawnTimer.stop();
                if (this.enemy.state !== "Dead")
                    this.enemy.processDeath();
                this.loot.removeAll();
                this.selectedArea = undefined;
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

            tick() {
                this.passiveTick();
                this.activeTick();
                this.checkDeath();
                this.tickCount++;
            }

            runTrials(monsterID: any, dungeonID: any, trials: any, tickLimit: any, verbose = false) {
                this.resetSimStats();
                const startTimeStamp = performance.now();
                const monster = this.game.monsters.getObjectByID(monsterID);
                let areaData = MICSR.game.getMonsterArea(monster);
                if (dungeonID !== undefined) {
                    areaData = MICSR.dungeons.getObjectByID(dungeonID);
                    this.dungeonProgress = 0;
                    while (areaData.monsters[this.dungeonProgress].id !== monsterID) {
                        this.dungeonProgress++;
                    }
                }
                const totalTickLimit = trials * tickLimit;
                const success = this.player.checkRequirements(areaData.entryRequirements, true, 'fight this monster.');
                if (success) {
                    this.selectMonster(monster, areaData);
                    MICSR.log('progressing:', monster, areaData);
                    while (this.simStats.killCount + this.simStats.deathCount < trials && this.tickCount < totalTickLimit) {
                        if (!this.isActive && !this.spawnTimer.active) {
                            this.selectMonster(monster, areaData);
                        }
                        if (this.paused) {
                            this.resumeDungeon();
                        }
                        this.tick();
                        if (this.spawnTimer.active) {
                            if (this.spawnTimer.ticksLeft % 10 === 1) {
                                //MICSR.log('spawning', this.spawnTimer.ticksLeft);
                            }
                        } else {
                            //MICSR.log('ticked', this.enemy.hitpoints, this.enemy.stats.maxHitpoints, this.player.hitpoints, this.player.stats.maxHitpoints);
                        }
                    }
                }
                this.stopCombat();
                const processingTime = performance.now() - startTimeStamp;
                const simResult = this.getSimStats(monsterID, dungeonID, success);
                if (verbose) {
                    MICSR.log(`Processed ${this.simStats.killCount} / ${this.simStats.deathCount} k/d and ${this.tickCount} ticks in ${processingTime / 1000}s (${processingTime / this.tickCount}ms/tick).`, simResult);
                }
                return simResult;
            }
        }
    }

    let loadCounter = 0;
    const waitLoadOrder = (reqs: any, setup: any, id: any) => {
        if (typeof characterSelected === typeof undefined) {
            return;
        }
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
    waitLoadOrder(reqs, setup, 'SimManager');

})();