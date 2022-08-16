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
/// <reference path="../typedefs.js" />

(() => {
    // spoof MICSR
    const MICSR = {
        debug: (...args) => console.debug('MICSR:', ...args),
        log: (...args) => console.log('MICSR:', ...args),
        warn: (...args) => console.warn('MICSR:', ...args),
        error: (...args) => console.error('MICSR:', ...args),
    }

    // spoof document
    const document = {
        getElementById() {
        }
    };

    // spoof $ so we get useful information regarding where the bugs are
    const $ = (...args) => console.log(...args);

    /** @type {CombatSimulator} */
    let combatSimulator;

    onmessage = (event) => {
        switch (event.data.action) {
            case 'RECEIVE_GAMEDATA':
                // constants
                event.data.constantNames.forEach(name => {
                    self[name] = event.data.constants[name];
                });
                // functions
                event.data.functionNames.forEach(name => {
                    eval(event.data.functions[name]);
                });
                // update modifierData functions
                for (const m in modifierData) {
                    if (modifierData[m].modifyValue !== undefined) {
                        if (modifierData[m].modifyValue === 'modifyValue') {
                            modifierData[m].modifyValue = MICSR[`${m}ModifyValue`];
                        } else {
                            modifierData[m].modifyValue = MICSR[modifierData[m].modifyValue];
                        }
                    }
                }
                // update itemConditionalModifiers
                for (let i = 0; i < itemConditionalModifiers.length; i++) {
                    for (let j = 0; j < itemConditionalModifiers[i].conditionals.length; j++) {
                        itemConditionalModifiers[i].conditionals[j].condition = MICSR[`itemConditionalModifiers-condition-${i}-${j}`];
                    }
                }
                const conditionalModifiers = new Map();
                itemConditionalModifiers.forEach((itemCondition) => {
                    conditionalModifiers.set(itemCondition.itemID, itemCondition.conditionals);
                });
                // update Summoning functions
                for (const i in Summoning.synergies) {
                    if (Summoning.synergies[i].conditionalModifiers) {
                        for (let k = 0; k < Summoning.synergies[i].conditionalModifiers.length; k++) {
                            Summoning.synergies[i].conditionalModifiers[k].condition = MICSR[`SUMMONING-conditional-${i}-${k}`];
                        }
                    }
                }
                Summoning.getTabletConsumptionXP = getTabletConsumptionXP;
                Summoning.synergiesByItemID = Summoning.synergies.reduce((synergyMap, synergy) => {
                    const setSynergy = (item0, item1) => {
                        let itemMap = synergyMap.get(item0);
                        if (itemMap === undefined) {
                            itemMap = new Map();
                            synergyMap.set(item0, itemMap);
                        }
                        itemMap.set(item1, synergy);
                    };
                    const itemID0 = Summoning.marks[synergy.summons[0]].itemID;
                    const itemID1 = Summoning.marks[synergy.summons[1]].itemID;
                    setSynergy(itemID0, itemID1);
                    setSynergy(itemID1, itemID0);
                    return synergyMap;
                }, new Map());
                Summoning.marksByItemID = Summoning.marks.reduce((itemMap, mark) => {
                    itemMap.set(mark.itemID, mark);
                    return itemMap;
                }, new Map());
                Summoning.getMarkFromItemID = itemID => Summoning.marksByItemID.get(itemID);
                // update itemSynergies conditional modifiers
                for (let i = 0; i < itemSynergies.length; i++) {
                    if (itemSynergies[i].conditionalModifiers) {
                        for (let j = 0; j < itemSynergies[i].conditionalModifiers.length; j++) {
                            itemSynergies[i].conditionalModifiers[j].condition = MICSR[`itemSynergies-conditional-${i}-${j}`];
                        }
                    }
                }
                // create itemSynergyMap
                const itemSynergyMap = new Map();
                itemSynergies.forEach((synergy) => {
                    synergy.items.forEach((item) => {
                        let existingSynergies = itemSynergyMap.get(item);
                        if (existingSynergies === undefined) {
                            existingSynergies = [];
                            itemSynergyMap.set(item, existingSynergies);
                        }
                        existingSynergies.push(synergy);
                    });
                });
                // classes
                event.data.classNames.forEach(name => {
                    eval(event.data.classes[name]);
                });
                // create instances
                MICSR.showModifiersInstance = new MICSR.ShowModifiers('', 'MICSR', false);
                SlayerTask.data = self.slayerTaskData;
                combatSimulator = new CombatSimulator();
                break;
            case 'START_SIMULATION':
                const startTime = performance.now();
                //settings
                // run the simulation
                combatSimulator.simulateMonster(
                    event.data.simPlayer,
                    event.data.monsterID,
                    event.data.dungeonID,
                    event.data.trials,
                    event.data.maxTicks,
                ).then((simResult) => {
                    const timeTaken = performance.now() - startTime;
                    postMessage({
                        action: 'FINISHED_SIM',
                        monsterID: event.data.monsterID,
                        dungeonID: event.data.dungeonID,
                        simResult: simResult,
                        selfTime: timeTaken
                    });
                });
                break;
            case 'CANCEL_SIMULATION':
                combatSimulator.cancelSimulation();
                break;
        }
    };

    onerror = (error) => {
        postMessage({
            action: 'ERR_SIM',
            error: error,
        });
    }

    class CombatSimulator {
        constructor() {
            this.cancelStatus = false;
        }

        /**
         * Simulation Method for a single monster
         * @param {SimPlayer} player
         * @param {Object} settings
         * @return {Promise<Object>}
         */
        async simulateMonster(simPlayerData, monsterID, dungeonID, trials, maxTicks) {
            const manager = new MICSR.SimManager();
            const player = manager.player;
            const reader = new DataReader(simPlayerData);
            player.deserialize(reader);
            player.initForWebWorker();
            try {
                return manager.convertSlowSimToResult(manager.runTrials(monsterID, dungeonID, trials, maxTicks), trials);
            } catch (error) {
                MICSR.error(`Error while simulating monster ${monsterID} in dungeon ${dungeonID}: ${error}`);
                return {
                    simSuccess: false,
                    reason: 'simulation error',
                }
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
})();