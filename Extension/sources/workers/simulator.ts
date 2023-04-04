/*  Melvor Idle Combat Simulator

    Copyright (C) <2020>  <Coolrox95>
    Modified Copyright (C) <2020> <Visua0>
    Modified Copyright (C) <2020, 2021> <G. Miclotte>
    Modified Copyright (C) <2022, 2023> <Broderick Hyman>

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

(async () => {
    // spoof MICSR
    const logging = {
        debug: (...args: any[]) => console.debug("MICSR:", ...args),
        log: (...args: any[]) => console.log("MICSR:", ...args),
        warn: (...args: any[]) => console.warn("MICSR:", ...args),
        error: (...args: any[]) => console.error("MICSR:", ...args),
    };

    // spoof document
    const document = {
        getElementById() {},
        createElement() {},
    };

    // spoof $ so we get useful information regarding where the bugs are
    const $ = (...args: any[]) => console.log(...args);

    importScripts("https://steam.melvoridle.com/assets/js/pako.min.js");

    // Fake globals
    const combatMenus = {
        eventMenu: {
            setButtonCallbacks() {},
        },
    };

    self.addModalToQueue = () => undefined;

    // Hard to copy functions
    const levelUnlockSum = (skill: Skill<BaseSkillData>) => (previous: number, current: Skill<BaseSkillData>) => {
        if (skill.level >= current.level) previous++;
        return previous;
      };

    let combatSimulator: CombatSimulator;

    onmessage = async (event) => {
        /*
    // TODO: remove temporary reply
    switch (event.data.action) {
        case 'RECEIVE_GAMEDATA':
            // constants
            event.data.constantNames.forEach((name: any) => {
                self[name] = event.data.constants[name];
            });
            // functions
            event.data.functionNames.forEach((name: any) => {
                eval(event.data.functions[name]);
            });
            // classes
            event.data.classNames.forEach((name: any) => {
                eval(event.data.classes[name]);
            });
            // create instances
            return;
        case 'START_SIMULATION':
            postMessage({
                action: 'FINISHED_SIM',
                monsterID: event.data.monsterID,
                dungeonID: event.data.dungeonID,
                simResult: {
                    // success
                    simSuccess: true,
                    reason: undefined,
                    tickCount: 10,
                    // xp rates
                    xpPerSecond: 10,
                    hpXpPerSecond: 10,
                    slayerXpPerSecond: 10,
                    prayerXpPerSecond: 10,
                    summoningXpPerSecond: 10,
                    // consumables
                    ppConsumedPerSecond: 10,
                    ammoUsedPerSecond: 0,
                    runesUsedPerSecond: 0,
                    usedRunesBreakdown: 0,
                    combinationRunesUsedPerSecond: 0,
                    potionsUsedPerSecond: 0, // TODO: divide by potion capacity
                    tabletsUsedPerSecond: 0,
                    atePerSecond: 0,
                    // survivability
                    deathRate: 0.5,
                    highestDamageTaken: 10,
                    lowestHitpoints: 10,
                    // kill time
                    killTimeS: 10,
                    killsPerSecond: 0.1,
                    // loot gains
                    baseGpPerSecond: 10, // gpPerSecond is computed from this
                    dropChance: NaN,
                    signetChance: NaN,
                    petChance: NaN,
                    petRolls: [],
                    slayerCoinsPerSecond: 0,
                    // not displayed -> TODO: remove?
                    simulationTime: NaN,
                },
                selfTime: 0,
            });
            return;
        case 'CANCEL_SIMULATION':
            combatSimulator.cancelSimulation();
            return;
    }
     */
        switch (event.data.action) {
            case "RECEIVE_GAMEDATA":
                // debugger;

                // constants
                event.data.constantNames.forEach((name: any) => {
                    // this.micsr.log('constant', name, event.data.constants[name])
                    // logging.log('constant', name)
                    self[name] = event.data.constants[name];
                });
                // functions
                event.data.functionNames.forEach((name: any) => {
                    // this.micsr.log('function', name, event.data.functions[name])
                    // logging.log('function', name)
                    eval(event.data.functions[name]);
                });
                // classes
                event.data.classNames.forEach((name: any) => {
                    // logging.log('class', name)
                    eval(event.data.classes[name]);
                });
                
                // just eval telemetry class
                eval(`
                    self['Telemetry'] = class {
                        constructor() {
                            this.ENABLE_TELEMETRY = false;
                            this.telemetryPayloadsToProcess = new Map();
                        }
                        get isTelemetryEnabled() { return this.ENABLE_TELEMETRY && PlayFabClientSDK.IsClientLoggedIn(); }
                        createMonsterKillEvent(monster, count = 1) {
                            if (!this.isTelemetryEnabled)
                                return; const existingEvent = this.getExistingTelemetryEvent('monster_killed', monster.id); const eventData = existingEvent !== undefined ? existingEvent : new MonsterKilledTelemetryEvent(monster, count); if (existingEvent !== undefined && existingEvent instanceof MonsterKilledTelemetryEvent && eventData instanceof MonsterKilledTelemetryEvent) { eventData.count += count; }
                            if (DEBUGENABLED)
                                console.log('Creating monster kill telemetry event', eventData); this.scheduleTelemetryEvent('monster_killed', monster.id, eventData);
                        }
                        createPlayerDeathEvent(cause = 'Unknown', itemLost = 'None') {
                            if (!this.isTelemetryEnabled)
                                return; const existingEvent = this.getExistingTelemetryEvent('player_death', 'player_death'); const eventData = existingEvent !== undefined ? existingEvent : new PlayerDeathTelemetryEvent(cause, itemLost); if (DEBUGENABLED)
                                console.log('Creating player death telemetry event', eventData); this.scheduleTelemetryEvent('player_death', 'player_death', eventData);
                        }
                        updatePlayerDeathEventItemLost(itemLost, count = 0) {
                            const deathEvent = this.getExistingTelemetryEvent('player_death', 'player_death'); if (deathEvent === undefined)
                                return; if (deathEvent instanceof PlayerDeathTelemetryEvent) { deathEvent.setItemLost(itemLost, count); this.scheduleTelemetryEvent('player_death', 'player_death', deathEvent); }
                        }
                        updatePlayerDeathEventCause(cause) {
                            const deathEvent = this.getExistingTelemetryEvent('player_death', 'player_death'); if (deathEvent === undefined)
                                return; if (deathEvent instanceof PlayerDeathTelemetryEvent) { deathEvent.setCause(cause); this.scheduleTelemetryEvent('player_death', 'player_death', deathEvent); }
                        }
                        createOfflineXPGainEvent(skill, offlineTime) {
                            if (!this.isTelemetryEnabled)
                                return; const existingEvent = this.getExistingTelemetryEvent('offline_xp_gain', skill.id); const eventData = existingEvent !== undefined ? existingEvent : new OfflineXPGainTelemetryEvent(skill, skill.level, skill.xp, offlineTime); if (DEBUGENABLED)
                                console.log('Creating offline skill XP telemetry event', eventData); this.scheduleTelemetryEvent('offline_xp_gain', skill.id, eventData);
                        }
                        updateOfflineXPGainAfterValues(skill) {
                            if (!this.isTelemetryEnabled)
                                return; const event = this.getExistingTelemetryEvent('offline_xp_gain', skill.id); if (event === undefined)
                                return; if (event instanceof OfflineXPGainTelemetryEvent) { event.updateValues(skill.level, skill.xp); this.scheduleTelemetryEvent('offline_xp_gain', skill.id, event); }
                        }
                        purgeOfflineXPGainEvents(skill) {
                            if (!this.isTelemetryEnabled)
                                return; const event = this.getExistingTelemetryEvent('offline_xp_gain', skill.id); if (event === undefined)
                                return; if (event instanceof OfflineXPGainTelemetryEvent) {
                                    if (event.requiresPurge)
                                        this.removeTelemetryEvent('offline_xp_gain', skill.id);
                                }
                        }
                        createItemGainedEvent(item, volume, source) {
                            if (!this.isTelemetryEnabled)
                                return; const eventID = \`\${item.id}.\${source}\`; const existingEvent = this.getExistingTelemetryEvent('item_gained', eventID); const eventData = existingEvent !== undefined ? existingEvent : new ItemGainedTelemetryEvent(item, volume, source); if (existingEvent !== undefined && existingEvent instanceof ItemGainedTelemetryEvent && eventData instanceof ItemGainedTelemetryEvent) { eventData.itemVolume += volume; }
                            this.scheduleTelemetryEvent('item_gained', eventID, eventData);
                        }
                        removeTelemetryEvent(eventType, eventID) {
                            const events = this.telemetryPayloadsToProcess.get(eventType); if (events === undefined)
                                return; events.delete(eventID); console.log(\`Removed Telemetry Event: \${eventType} - \${eventID}\`);
                        }
                        getExistingTelemetryEvent(eventType, eventID) {
                            const events = this.telemetryPayloadsToProcess.get(eventType); if (events === undefined)
                                return undefined; return events.get(eventID);
                        }
                        getTelemetryEventBody(event) { return { EventNamespace: 'custom', Name: event.type, Payload: event.payload, }; }
                        fireSingle(event) {
                            if (!this.isTelemetryEnabled)
                                return; if (DEBUGENABLED)
                                console.log(\`Firing Single Telemetry event (\${event.type}): \${JSON.stringify(event.payload)}\`); const eventBody = this.getTelemetryEventBody(event); this.fireTelemetryEvents([eventBody]);
                        }
                        fireEventType(eventType) {
                            if (!this.isTelemetryEnabled)
                                return; const events = this.telemetryPayloadsToProcess.get(eventType); if (events === undefined)
                                return; this.processTelemetryPayload(eventType, events); this.telemetryPayloadsToProcess.delete(eventType);
                        }
                        scheduleTelemetryEvent(eventType, eventID, event) {
                            if (!this.isTelemetryEnabled)
                                return; const currentEvents = this.telemetryPayloadsToProcess.get(eventType); const eventData = currentEvents !== undefined ? currentEvents : new Map(); eventData.set(eventID, event); this.telemetryPayloadsToProcess.set(eventType, eventData); this.onTelemetryEventCreation();
                        }
                        onTelemetryEventCreation() { this.fireEventsIfLimitsReached(); }
                        fireEventsIfLimitsReached() {
                            if (!this.isTelemetryEnabled)
                                return; if (this.getTelemetryEventSize() >= 100) { this.processScheduledTelemetryData(); }
                        }
                        getTelemetryEventSize() { let count = 0; this.telemetryPayloadsToProcess.forEach((event) => (count += event.size)); return count; }
                        processScheduledTelemetryData() {
                            if (!this.isTelemetryEnabled)
                                return; const events = []; this.telemetryPayloadsToProcess.forEach((event, eventType) => { events.concat(this.processTelemetryPayload(eventType, event)); }); this.fireTelemetryEvents(events);
                        }
                        processTelemetryPayload(eventType, event) {
                            if (!this.isTelemetryEnabled)
                                return []; const events = []; event.forEach((eventData) => {
                                    if (DEBUGENABLED)
                                        console.log(\`Prepairing to fire Telemetry Event (\${eventType}): \${JSON.stringify(eventData.payload)}\`); const eventBody = this.getTelemetryEventBody(eventData); events.push(eventBody);
                                }); return events;
                        }
                        fireTelemetryEvents(events) {
                            if (!this.isTelemetryEnabled)
                                return; const eventBody = { Events: events, }; cloudManager.playfabEventAPI('WriteTelemetryEvents', eventBody).then((result) => {
                                    if (result.code === 200) {
                                        if (DEBUGENABLED)
                                            console.log(\`Telemetry Event(s) fired successfully.\`); this.telemetryPayloadsToProcess.clear();
                                    }
                                    else { console.error(\`Telemetry Event(s) failed to fire. Error: \${result.errorMessage}\`); }
                                }).catch((error) => { console.error(error); });
                        }
                }`);


                // create instances
                // restore data
                const cloneData = new CloneData();
                cloneData.restoreModifierData();
                SlayerTask.data = event.data.slayerTaskData;
                // Save off global object
                // @ts-expect-error
                self.exp = new ExperienceCalculator();
                const full = event.data.dataPackage.Full;
                const toth = event.data.dataPackage.TotH;
                // @ts-expect-error
                cloudManager.hasTotHEntitlement = !!toth;
                // @ts-expect-error
                cloudManager.hasFullVersionEntitlement = !!full;

                const micsr = new MICSR();
                const simGame = new SimGame(micsr, true);
                micsr.dataPackage = event.data.dataPackage;
                micsr.cleanupDataPackage("Demo");
                if (cloudManager.hasFullVersionEntitlement) {
                    micsr.cleanupDataPackage("Full");
                }
                if (cloudManager.hasTotHEntitlement) {
                    micsr.cleanupDataPackage("TotH");
                }

                // @ts-expect-error
                Summoning.markLevels = event.data.SummoningMarkLevels;

                await micsr.initialize(simGame, simGame as any);

                // @ts-expect-error
                self.firstSkillAction = true;
                self.saveData = (vars?) => {};
                // @ts-expect-error
                self.deleteScheduledPushNotification = () => {};

                combatSimulator = new CombatSimulator(micsr);
                break;
            case "START_SIMULATION":
                const startTime = performance.now();
                //settings
                // run the simulation
                combatSimulator
                    .simulateMonster(
                        event.data.saveString,
                        event.data.monsterID,
                        event.data.dungeonID,
                        event.data.trials,
                        event.data.maxTicks
                    )
                    .then((simResult: any) => {
                        const timeTaken = performance.now() - startTime;
                        postMessage({
                            action: "FINISHED_SIM",
                            monsterID: event.data.monsterID,
                            dungeonID: event.data.dungeonID,
                            simResult: simResult,
                            selfTime: timeTaken,
                        });
                    });
                break;
            case "CANCEL_SIMULATION":
                combatSimulator.cancelSimulation();
                break;
        }
    };

    onerror = (error) => {
        postMessage({
            action: "ERR_SIM",
            error: error,
        });
    };
})();

class CombatSimulator {
    cancelStatus: any;
    micsr: MICSR;

    constructor(micsr: MICSR) {
        this.micsr = micsr;
        this.cancelStatus = false;
    }

    /**
     * Simulation Method for a single monster
     */
    async simulateMonster(
        saveString: string,
        monsterID: string,
        dungeonID: string,
        trials: number,
        maxTicks: number
    ) {
        try {
            // this.micsr.log("Creating manager");
            const reader = new SaveWriter("Read", 1);
            const saveVersion = reader.setDataFromSaveString(saveString);
            this.micsr.game.decodeSimple(reader, saveVersion);
            this.micsr.game.onLoad();
            this.micsr.game.combat.player.initForWebWorker();

            // this.micsr.log("Finished setup");
            return this.micsr.game.combat.convertSlowSimToResult(
                this.micsr.game.combat.runTrials(
                    monsterID,
                    dungeonID,
                    trials,
                    maxTicks
                ),
                trials
            );
        } catch (error) {
            this.micsr.error(
                `Error while simulating monster ${monsterID} in dungeon ${dungeonID}: ${error}`
            );
            let reason = "simulation error";
            if (error instanceof Error) {
                reason += `: ${error.message}`;
            }
            return {
                simSuccess: false,
                reason: reason,
            };
        }
    }

    /**
     * Checks if the simulation has been messaged to be cancelled
     * @return {Promise<boolean>}
     */
    async isCanceled() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.cancelStatus);
            });
        });
    }

    cancelSimulation() {
        this.cancelStatus = true;
    }
}
