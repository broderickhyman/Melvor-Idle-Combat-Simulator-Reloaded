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

    const reqs = [
        'SimEnemy',
        'SimManager',
        'SimPlayer',
    ];

    const setup = () => {

        const MICSR = (window as any).MICSR;

        /**
         * Simulator class, used for all simulation work, and storing simulation results and settings
         */
        MICSR.Simulator = class {
            currentJob: any;
            currentSim: any;
            dungeonSimData: any;
            dungeonSimFilter: any;
            isTestMode: any;
            maxThreads: any;
            monsterSimData: any;
            monsterSimIDs: any;
            monsterSimFilter: any;
            newSimData: any;
            notSimulatedReason: any;
            parent: any;
            selectedPlotIsTime: any;
            selectedPlotScales: any;
            simCancelled: any;
            simInProgress: any;
            simStartTime: any;
            simulationQueue: any;
            simulationWorkers: any;
            slayerSimData: any;
            slayerSimFilter: any;
            slayerTaskMonsters: any;
            testCount: any;
            testMax: any;
            workerURL: any;

            constructor(parent: any, workerURL: any) {
                this.parent = parent;
                // Simulation settings
                this.monsterSimFilter = {};
                this.dungeonSimFilter = {};
                this.slayerSimFilter = {};
                // not simulated reason
                this.notSimulatedReason = 'entity not simulated';
                // Simulation data;
                this.newSimData = (isMonster: any) => {
                    const data = {
                        simSuccess: false,
                        reason: this.notSimulatedReason,
                    };
                    if (isMonster) {
                        (data as any).inQueue = false;
                        (data as any).petRolls = {other: []};
                    }
                    return data
                }
                this.monsterSimIDs = [];
                this.monsterSimData = {};
                MICSR.monsters.forEach((monster: any) => {
                    this.monsterSimData[monster.id] = this.newSimData(true);
                    this.monsterSimIDs.push(monster.id);
                    this.monsterSimFilter[monster.id] = true;
                });
                this.dungeonSimData = {};
                MICSR.dungeons.forEach((dungeon: any) => {
                    this.dungeonSimData[dungeon.id] = this.newSimData(false);
                    this.dungeonSimFilter[dungeon.id] = true;
                    dungeon.monsters.forEach((monster: any) => {
                        const simID = this.simID(monster.id, dungeon.id);
                        if (!this.monsterSimData[simID]) {
                            this.monsterSimData[simID] = this.newSimData(true);
                            this.monsterSimIDs.push(simID);
                        }
                    });
                });
                //
                this.slayerTaskMonsters = {};
                this.slayerSimData = {};
                MICSR.slayerTaskData.forEach((task: any) => {
                    this.slayerTaskMonsters[task.display] = [];
                    this.slayerSimData[task.display] = this.newSimData(false);
                    this.slayerSimFilter[task.display] = true;
                });
                /** Variables of currently stored simulation */
                this.currentSim = this.initCurrentSim();
                // Options for time multiplier
                this.selectedPlotIsTime = true;
                this.selectedPlotScales = true;
                // Test Settings
                this.isTestMode = false;
                this.testMax = 10;
                this.testCount = 0;
                // Simulation queue and webworkers
                this.workerURL = workerURL;
                this.currentJob = 0;
                this.simInProgress = false;
                this.simulationQueue = [];
                this.simulationWorkers = [];
                this.maxThreads = 1; // TODO: window.navigator.hardwareConcurrency;
                this.simStartTime = 0;
                /** If the current sim has been cancelled */
                this.simCancelled = false;
                // Create Web workers
                this.createWorkers();
            }

            /**
             * Initializes a performance test
             */
            runTest(numSims: any) {
                this.testCount = 0;
                this.isTestMode = true;
                this.testMax = numSims;
                this.simulateCombat(false);
            }

            /**
             * Creates the webworkers for simulation jobs
             */
            async createWorkers() {
                for (let i = 0; i < this.maxThreads; i++) {
                    const worker = await this.createWorker();
                    this.intializeWorker(worker, i);
                    const newWorker = {
                        worker: worker,
                        inUse: false,
                        selfTime: 0,
                    };
                    this.simulationWorkers.push(newWorker);
                }
            }

            /**
             * Attempts to create a web worker, if it fails uses a chrome hack to get a URL that works
             * @return {Promise<Worker>}
             */
            createWorker() {
                return new Promise((resolve, reject) => {
                    let newWorker;
                    try {
                        newWorker = new Worker(this.workerURL);
                        resolve(newWorker);
                    } catch (error) {
                        // Chrome Hack
                        if ((error as any).name === 'SecurityError' && (error as any).message.includes('Failed to construct \'Worker\': Script')) {
                            const workerContent = new XMLHttpRequest();
                            workerContent.open('GET', this.workerURL);
                            workerContent.send();
                            workerContent.addEventListener('load', (event) => {
                                const blob = new Blob([(event.currentTarget as any).responseText], {type: 'application/javascript'});
                                this.workerURL = URL.createObjectURL(blob);
                                resolve(new Worker(this.workerURL));
                            });
                        } else { // Other Error
                            reject(error);
                        }
                    }
                });
            }

            // TODO: refactor intializeWorker
            /**
             * Intializes a simulation worker
             * @param {Worker} worker
             * @param {number} i
             */
            intializeWorker(worker: any, i: any) {
                // constants
                const constantNames: {
                    name: string;
                    data: any;
                }[] = [];
                const constants: { [name: string]: string; } = {};
                constantNames.forEach(constant =>
                    constants[constant.name] = constant.data
                );
                // functions
                const functionNames: {
                    name: string;
                    data: any;
                }[] = [];
                const functions: { [name: string]: string; } = {};
                functionNames.forEach(func => {
                    let fstring = func.data.toString();
                    if (!fstring.startsWith('function ') && !fstring.includes('=>')) {
                        fstring = 'function ' + fstring;
                    }
                    fstring = fstring.replace(`function ${func.name}`, 'function');
                    if (func.name.startsWith('MICSR.')) {
                        functions[func.name] = `${func.name} = ${fstring}`;
                    } else {
                        functions[func.name] = `self['${func.name}'] = ${fstring}`;
                    }
                });
                // classes
                const classNames: any[] = [];
                const classes: { [name: string]: string; } = {};
                classNames.forEach(clas => {
                    const s = clas.data.toString()
                        // remove class name
                        .replace(`class ${clas.name}`, 'class')
                        // remove logging from CombatManager constructor
                        .replace(`console.log('Combat Manager Built...');`, '')
                        // fix Character bug
                        //TODO: remove this when Character.applyDOT no longer refers to the global combatManager object
                        .replace('combatManager', 'this.manager');
                    if (clas.name.startsWith('MICSR.')) {
                        classes[clas.name] = `${clas.name} = ${s}`;
                    } else {
                        classes[clas.name] = `self['${clas.name}'] = ${s}`;
                    }
                });
                // worker
                worker.onmessage = (event: any) => this.processWorkerMessage(event, i);
                worker.onerror = (event: any) => {
                    MICSR.log('An error occured in a simulation worker');
                    MICSR.log(event);
                };
                worker.postMessage({
                    action: 'RECEIVE_GAMEDATA',
                    // constants
                    constantNames: constantNames.map(x => x.name),
                    constants: constants,
                    // functions
                    functionNames: functionNames.map(x => x.name),
                    functions: functions,
                    // classes
                    classNames: classNames.map(x => x.name),
                    classes: classes,
                });
            }

            /**
             * Iterate through all the combatAreas and MICSR.dungeons to create a set of monsterSimData and dungeonSimData
             */
            simulateCombat(single: any) {
                this.setupCurrentSim(single);
                // Start simulation workers
                // @ts-expect-error TS(2531): Object is possibly 'null'.
                document.getElementById('MCS Simulate All Button').textContent = `Cancel (0/${this.simulationQueue.length})`;
                this.initializeSimulationJobs();
            }

            initCurrentSim() {
                return {
                    options: {
                        trials: MICSR.trials,
                    },
                }
            }

            simID(monsterID: any, dungeonID: any) {
                if (dungeonID === undefined) {
                    return monsterID;
                }
                return `${dungeonID}-${monsterID}`
            }

            pushMonsterToQueue(monsterID: any, dungeonID: any) {
                const simID = this.simID(monsterID, dungeonID);
                if (!this.monsterSimData[simID].inQueue) {
                    this.monsterSimData[simID].inQueue = true;
                    this.simulationQueue.push({monsterID: monsterID, dungeonID: dungeonID});
                }
            }

            resetSingleSimulation() {
                // clear queue
                this.simulationQueue = [];
                this.resetSimDone();
                // check selection
                if (!this.parent.barSelected && !this.parent.isViewingDungeon) {
                    this.parent.notify('There is nothing selected!', 'danger');
                    return {};
                }
                // area monster
                if (!this.parent.isViewingDungeon && this.parent.barIsMonster(this.parent.selectedBar)) {
                    const monsterID = this.parent.barMonsterIDs[this.parent.selectedBar];
                    if (this.monsterSimFilter[monsterID]) {
                        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                        this.pushMonsterToQueue(monsterID);
                    } else {
                        this.parent.notify('The selected monster is filtered!', 'danger');
                    }
                    return {};
                }
                // dungeon
                let dungeonID: any = undefined;
                if (!this.parent.isViewingDungeon && this.parent.barIsDungeon(this.parent.selectedBar)) {
                    dungeonID = this.parent.barMonsterIDs[this.parent.selectedBar];
                } else if (this.parent.isViewingDungeon && MICSR.isDungeonID(this.parent.viewedDungeonID)) {
                    dungeonID = this.parent.viewedDungeonID;
                }
                if (dungeonID !== undefined) {
                    if (this.dungeonSimFilter[dungeonID]) {
                        if (this.parent.isViewingDungeon && this.parent.barSelected) {
                            this.pushMonsterToQueue(this.parent.getSelectedDungeonMonsterID(), dungeonID);
                            return {dungeonID: dungeonID};
                        }
                        MICSR.dungeons[dungeonID].monsters.forEach((monsterID: any) => {
                            this.pushMonsterToQueue(monsterID, dungeonID);
                        });
                        return {dungeonID: dungeonID};
                    }
                    this.parent.notify('The selected dungeon is filtered!', 'danger');
                    return {};
                }
                // slayer area
                let taskID = undefined;
                if (!this.parent.isViewingDungeon && this.parent.barIsTask(this.parent.selectedBar)) {
                    taskID = this.parent.barMonsterIDs[this.parent.selectedBar];
                } else if (this.parent.isViewingDungeon && MICSR.isDungeonID(this.parent.viewedDungeonID)) {
                    taskID = this.parent.viewedDungeonID;
                }
                if (taskID !== undefined) {
                    if (this.slayerSimFilter[taskID]) {
                        this.queueSlayerTask(taskID);
                        return {taskID: taskID};
                    }
                    this.parent.notify('The selected task list is filtered!', 'danger');
                    return {};
                }
                // can't be reached
                return {};
            }

            queueSlayerTask(i: any) {
                const task = MICSR.slayerTaskData[i];
                this.slayerTaskMonsters[i] = [];
                if (!this.slayerSimFilter[i]) {
                    return;
                }
                const minLevel = task.minLevel;
                const maxLevel = task.maxLevel === -1 ? 6969 : task.maxLevel;
                MICSR.monsters.forEach((monster: any) => {
                    // check if it is a slayer monster
                    if (!monster.canSlayer) {
                        return;
                    }
                    // check if combat level fits the current task type
                    // @ts-expect-error TS(2304): Cannot find name 'getMonsterCombatLevel'.
                    const cbLevel = getMonsterCombatLevel(monsterID);
                    if (cbLevel < minLevel || cbLevel > maxLevel) {
                        return;
                    }
                    // check if the area is accessible, this only works for auto slayer
                    // without auto slayer you can get some tasks for which you don't wear/own the gear
                    // @ts-expect-error TS(2304): Cannot find name 'getMonsterArea'.
                    let area = getMonsterArea(monsterID);
                    if (!this.parent.player.checkRequirements(area.entryRequirements)) {
                        return;
                    }
                    // all checks passed
                    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                    this.pushMonsterToQueue(monsterID);
                    this.slayerTaskMonsters[i].push(monster);
                });
            }

            resetSimulationData(single: any) {
                // Reset the simulation status of all enemies
                this.resetSimDone();
                // Set up simulation queue
                this.simulationQueue = [];
                if (single) {
                    this.currentSim.ids = this.resetSingleSimulation();
                    return;
                }
                // Queue simulation of monsters in combat areas
                // @ts-expect-error TS(2304): Cannot find name 'combatAreas'.
                combatAreas.forEach((area: any) => {
                    area.monsters.forEach((monsterID: any) => {
                        if (this.monsterSimFilter[monsterID]) {
                            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                            this.pushMonsterToQueue(monsterID);
                        }
                    });
                });
                // Wandering Bard
                if (this.monsterSimFilter[MICSR.bardID]) {
                    this.pushMonsterToQueue(MICSR.bardID, undefined);
                }
                // Queue simulation of monsters in slayer areas
                // @ts-expect-error TS(2304): Cannot find name 'slayerAreas'.
                slayerAreas.forEach((area: any) => {
                    if (!this.parent.player.checkRequirements(area.entryRequirements)) {
                        const tryToSim = area.monsters.reduce((sim: any, monsterID: any) => (this.monsterSimFilter[monsterID] && !this.monsterSimData[monsterID].inQueue) || sim, false);
                        if (tryToSim) {
                            this.parent.notify(`Can't access ${area.name}`, 'danger');
                            area.monsters.forEach((monsterID: any) => {
                                this.monsterSimData[monsterID].reason = 'cannot access area';
                            });
                        }
                        return;
                    }
                    area.monsters.forEach((monsterID: any) => {
                        if (this.monsterSimFilter[monsterID]) {
                            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                            this.pushMonsterToQueue(monsterID);
                        }
                    });
                });
                // Queue simulation of monsters in dungeons
                MICSR.dungeons.forEach((dungeon: any) => {
                    if (this.dungeonSimFilter[dungeon]) {
                        for (let j = 0; j < dungeon.monsters.length; j++) {
                            const monsterID = dungeon.monsters[j];
                            this.pushMonsterToQueue(monsterID, dungeon);
                        }
                    }
                });
                // Queue simulation of monsters in slayer tasks
                for (let taskID = 0; taskID < this.slayerTaskMonsters.length; taskID++) {
                    this.queueSlayerTask(taskID);
                }
            }

            /**
             * Setup currentsim variables
             */
            setupCurrentSim(single: any) {
                this.simStartTime = performance.now();
                this.simCancelled = false;
                this.currentSim = this.initCurrentSim();
                // reset and setup sim data
                this.resetSimulationData(single);
            }

            combineReasons(data: any, monsterIDs: any, dungeonID: any) {
                let reasons: any = [];
                for (const monsterID of monsterIDs) {
                    const simID = this.simID(monsterID, dungeonID);
                    if (!this.monsterSimData[simID].simSuccess) {
                        data.simSuccess = false;
                    }
                    const reason = this.monsterSimData[simID].reason;
                    if (reason && !reasons.includes(reason)) {
                        reasons.push(reason);
                    }
                }
                if (reasons.length) {
                    data.reason = reasons.join(', ');
                    return true;
                }
                data.reason = undefined;
                return false;
            }

            computeAverageSimData(filter: any, data: any, monsterIDs: any, dungeonID: any = undefined) {
                // check filter
                if (!filter) {
                    data.simSuccess = false;
                    data.reason = 'entity filtered';
                    return;
                }
                // combine failure reasons, if any
                this.combineReasons(data, monsterIDs, dungeonID);
                data.simSuccess = true;
                data.tickCount = 0;

                // not time-weighted averages
                data.deathRate = 0;
                data.highestDamageTaken = 0;
                data.lowestHitpoints = Infinity;
                data.killTimeS = 0;
                data.simulationTime = 0;
                for (const monsterID of monsterIDs) {
                    const simID = this.simID(monsterID, dungeonID);
                    const mData = this.monsterSimData[simID];
                    data.simSuccess &&= mData.simSuccess;
                    data.deathRate = 1 - (1 - data.deathRate) * (1 - mData.deathRate);
                    data.highestDamageTaken = Math.max(data.highestDamageTaken, mData.highestDamageTaken);
                    data.lowestHitpoints = Math.min(data.lowestHitpoints, mData.lowestHitpoints);
                    data.killTimeS += mData.killTimeS;
                    data.simulationTime += mData.simulationTime;
                    data.tickCount = Math.max(data.tickCount, mData.tickCount);
                }
                data.killsPerSecond = 1 / data.killTimeS;

                // time-weighted averages
                const computeAvg = (tag: any) => {
                    data[tag] = monsterIDs.map((monsterID: any) => this.monsterSimData[this.simID(monsterID, dungeonID)])
                        .reduce((avgData: any, mData: any) => avgData + mData[tag] * mData.killTimeS, 0) / data.killTimeS;
                }
                [
                    // xp rates
                    'xpPerSecond',
                    'hpXpPerSecond',
                    'slayerXpPerSecond',
                    'prayerXpPerSecond',
                    'summoningXpPerSecond',
                    // consumables
                    'ppConsumedPerSecond',
                    'ammoUsedPerSecond',
                    'runesUsedPerSecond',
                    'combinationRunesUsedPerSecond',
                    'potionsUsedPerSecond',
                    'tabletsUsedPerSecond',
                    'atePerSecond',
                    // survivability
                    // 'deathRate',
                    // 'highestDamageTaken',
                    // 'lowestHitpoints',
                    // kill time
                    // 'killTimeS',
                    // 'killsPerSecond',
                    // loot gains
                    'baseGpPerSecond',
                    'dropChance',
                    'signetChance',
                    'petChance',
                    'slayerCoinsPerSecond',
                    // unsorted
                    'dmgPerSecond',
                    'attacksMadePerSecond',
                    'attacksTakenPerSecond',
                    // 'simulationTime',
                ].forEach(tag => computeAvg(tag));

                // average rune breakdown
                data.usedRunesBreakdown = {};
                monsterIDs.map((monsterID: any) => this.monsterSimData[this.simID(monsterID, dungeonID)]
                ).forEach((mData: any) => {
                    for (const runeID in mData.usedRunesBreakdown) {
                        if (data.usedRunesBreakdown[runeID] === undefined) {
                            data.usedRunesBreakdown[runeID] = 0;
                        }
                        data.usedRunesBreakdown[runeID] += mData.usedRunesBreakdown[runeID] * mData.killTimeS / data.killTimeS;
                    }
                });
            }

            /** Performs all data analysis post queue completion */
            performPostSimAnalysis(isNewRun = false) {
                // Perform calculation of dungeon stats
                MICSR.dungeons.forEach((dungeon: any) => {
                    this.computeAverageSimData(this.dungeonSimFilter[dungeon], this.dungeonSimData[dungeon], dungeon.monsters, dungeon);
                });
                MICSR.slayerTaskData.forEach((task: any) => {
                    this.computeAverageSimData(this.slayerSimFilter[task.display], this.slayerSimData[task.display], this.slayerTaskMonsters[task.display]);
                    // correct average kps for auto slayer
                    this.slayerSimData[task.display].killsPerSecond *= this.slayerTaskMonsters[task.display].length;
                });
                // correct average kill time for auto slayer
                for (let slayerTaskID = 0; slayerTaskID < this.slayerTaskMonsters.length; slayerTaskID++) {
                    this.slayerSimData[slayerTaskID].killTimeS /= this.slayerTaskMonsters[slayerTaskID].length;
                }
                // Update other data
                this.parent.loot.update();
                // scale
                this.parent.consumables.update();
                // log time and save result
                if (isNewRun) {
                    MICSR.log(`Elapsed Simulation Time: ${performance.now() - this.simStartTime}ms`);
                    if (this.parent.trackHistory) {
                        this.saveResult();
                    }
                }
            }

            saveResult() {
                // store simulation
                const monsterSimData = {};
                for (const id in this.monsterSimData) {
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    monsterSimData[id] = {...this.monsterSimData[id]};
                }
                const save = {
                    settings: this.parent.import.exportSettings(),
                    export: '',
                    monsterSimData: monsterSimData,
                    dungeonSimData: this.dungeonSimData.map((x: any) => {
                        return {...x};
                    }),
                    slayerSimData: this.slayerSimData.map((x: any) => {
                        return {...x};
                    }),
                }
                save.export = JSON.stringify(save.settings, null, 1);
                this.parent.savedSimulations.push(save);
                this.parent.createCompareCard();
            }

            /** Starts processing simulation jobs */
            initializeSimulationJobs() {
                if (!this.simInProgress) {
                    if (this.simulationQueue.length > 0) {
                        this.simInProgress = true;
                        this.currentJob = 0;
                        for (let i = 0; i < this.simulationWorkers.length; i++) {
                            this.simulationWorkers[i].selfTime = 0;
                            if (i < this.simulationQueue.length) {
                                this.startJob(i);
                            } else {
                                break;
                            }
                        }
                    } else {
                        this.performPostSimAnalysis(true);
                        this.parent.updateDisplayPostSim();
                    }
                }
            }

            /** Starts a job for a given worker
             * @param {number} workerID
             */
            startJob(workerID: any) {
                if (this.currentJob < this.simulationQueue.length && !this.simCancelled) {
                    const monsterID = this.simulationQueue[this.currentJob].monsterID;
                    const dungeonID = this.simulationQueue[this.currentJob].dungeonID;
                    this.simulationWorkers[workerID].worker.postMessage({
                        action: 'START_SIMULATION',
                        monsterID: monsterID,
                        dungeonID: dungeonID,
                        simPlayer: this.parent.player.serialize(),
                        trials: MICSR.trials,
                        maxTicks: MICSR.maxTicks,
                    });
                    this.simulationWorkers[workerID].inUse = true;
                    this.currentJob++;
                } else {
                    // Check if none of the workers are in use
                    let allDone = true;
                    this.simulationWorkers.forEach((simWorker: any) => {
                        if (simWorker.inUse) {
                            allDone = false;
                        }
                    });
                    if (allDone) {
                        this.simInProgress = false;
                        this.performPostSimAnalysis(true);
                        this.parent.updateDisplayPostSim();
                        if (this.isTestMode) {
                            this.testCount++;
                            if (this.testCount < this.testMax) {
                                this.simulateCombat(false);
                            } else {
                                this.isTestMode = false;
                            }
                        }
                        // MICSR.log(this.simulationWorkers);
                    }
                }
            }

            /**
             * Attempts to cancel the currently running simulation and sends a cancelation message to each of the active workers
             */
            cancelSimulation() {
                this.simCancelled = true;
                this.simulationWorkers.forEach((simWorker: any) => {
                    if (simWorker.inUse) {
                        simWorker.worker.postMessage({action: 'CANCEL_SIMULATION'});
                    }
                });
            }

            /**
             * Processes a message received from one of the simulation workers
             * @param {MessageEvent} event The event data of the worker
             * @param {number} workerID The ID of the worker that sent the message
             */
            processWorkerMessage(event: any, workerID: any) {
                // MICSR.log(`Received Message ${event.data.action} from worker: ${workerID}`);
                if (!event.data.simResult.simSuccess) {
                    MICSR.log({...event.data.simResult});
                }
                switch (event.data.action) {
                    case 'FINISHED_SIM':
                        // Send next job in queue to worker
                        this.simulationWorkers[workerID].inUse = false;
                        this.simulationWorkers[workerID].selfTime += event.data.selfTime;
                        // Transfer data into monsterSimData
                        const monsterID = event.data.monsterID;
                        const dungeonID = event.data.dungeonID;
                        const simID = this.simID(monsterID, dungeonID);
                        Object.assign(this.monsterSimData[simID], event.data.simResult);
                        this.monsterSimData[simID].simulationTime = event.data.selfTime;
                        // @ts-expect-error TS(2531): Object is possibly 'null'.
                        document.getElementById('MCS Simulate All Button').textContent = `Cancel (${this.currentJob - 1}/${this.simulationQueue.length})`;
                        // MICSR.log(event.data.simResult);
                        // Attempt to add another job to the worker
                        this.startJob(workerID);
                        break;
                    case 'ERR_SIM':
                        MICSR.error(event.data.error);
                        break;
                }
            }

            /**
             * Resets the simulation status for each monster
             */
            resetSimDone() {
                for (let simID in this.monsterSimData) {
                    this.monsterSimData[simID] = this.newSimData(true);
                }
                for (let simID in this.dungeonSimData) {
                    this.dungeonSimData[simID] = this.newSimData(false);
                }
                for (let simID in this.slayerSimData) {
                    this.slayerSimData[simID] = this.newSimData(false);
                }
            }

            /**
             * Extracts a set of data for plotting that matches the keyValue in monsterSimData and dungeonSimData
             * @param {string} keyValue
             * @return {number[]}
             */
            getDataSet(keyValue: any) {
                const dataSet = [];
                const isSignet = keyValue === 'signetChance';
                if (!this.parent.isViewingDungeon) {
                    // Compile data from monsters in combat zones
                    MICSR.monsterIDs.forEach((monsterID: any) => {
                        dataSet.push(this.getBarValue(this.monsterSimFilter[monsterID], this.monsterSimData[monsterID], keyValue));
                    });
                    // Perform simulation of monsters in dungeons
                    MICSR.dungeonIDs.forEach((dungeonID: any) => {
                        dataSet.push(this.getBarValue(this.dungeonSimFilter[dungeonID], this.dungeonSimData[dungeonID], keyValue));
                    });
                    // Perform simulation of monsters in slayer tasks
                    MICSR.taskIDs.forEach((taskID: any) => {
                        dataSet.push(this.getBarValue(this.slayerSimFilter[taskID], this.slayerSimData[taskID], keyValue));
                    });
                } else if (MICSR.isDungeonID(this.parent.viewedDungeonID)) {
                    // dungeons
                    const dungeonID = this.parent.viewedDungeonID;
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID: any) => {
                        const simID = this.simID(monsterID, dungeonID);
                        if (!isSignet) {
                            dataSet.push(this.getBarValue(true, this.monsterSimData[simID], keyValue));
                        } else {
                            dataSet.push(0);
                        }
                    });
                    if (isSignet) {
                        const bossId = MICSR.dungeons[dungeonID].monsters[MICSR.dungeons[dungeonID].monsters.length - 1];
                        const simID = this.simID(bossId, dungeonID);
                        dataSet[dataSet.length - 1] = this.getBarValue(true, this.monsterSimData[simID], keyValue);
                    }
                } else {
                    // slayer tasks
                    const taskID = this.parent.viewedDungeonID;
                    this.slayerTaskMonsters[taskID].forEach((monsterID: any) => {
                        if (!isSignet) {
                            dataSet.push(this.getBarValue(true, this.monsterSimData[monsterID], keyValue));
                        } else {
                            dataSet.push(0);
                        }
                    });
                }
                return dataSet;
            }

            getValue(filter: any, data: any, keyValue: any, scale: any) {
                if (filter && data.simSuccess) {
                    return this.getAdjustedData(data, keyValue) * this.getTimeMultiplier(data, keyValue, scale);
                }
                return NaN;
            }

            getBarValue(filter: any, data: any, keyValue: any) {
                return this.getValue(filter, data, keyValue, this.selectedPlotScales);
            }

            getTimeMultiplier(data: any, keyValue: any, scale: any) {
                let dataMultiplier = 1;
                if (scale) {
                    dataMultiplier = this.parent.timeMultiplier;
                }
                if (this.parent.timeMultiplier === -1 && scale) {
                    dataMultiplier = this.getAdjustedData(data, 'killTimeS');
                }
                if (keyValue === 'petChance') {
                    dataMultiplier = 1;
                }
                return dataMultiplier;
            }

            getAdjustedData(data: any, tag: any) {
                if (this.parent.consumables.applyRates) {
                    if (data.adjustedRates[tag] !== undefined) {
                        return data.adjustedRates[tag];
                    }
                }
                return data[tag];
            }

            getRawData() {
                const dataSet: any[] = [];
                if (!this.parent.isViewingDungeon) {
                    // Compile data from monsters in combat zones
                    MICSR.monsterIDs.forEach((monsterID: any) => {
                        dataSet.push(this.monsterSimData[monsterID]);
                    });
                    // Perform simulation of monsters in dungeons
                    MICSR.dungeonIDs.forEach((dungeonID: any) => {
                        dataSet.push(this.dungeonSimData[dungeonID]);
                    });
                    // Perform simulation of monsters in slayer tasks
                    MICSR.taskIDs.forEach((taskID: any) => {
                        dataSet.push(this.slayerSimData[taskID]);
                    });
                } else if (MICSR.isDungeonID(this.parent.viewedDungeonID)) {
                    // dungeons
                    const dungeonID = this.parent.viewedDungeonID;
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID: any) => {
                        dataSet.push(this.monsterSimData[this.simID(monsterID, dungeonID)]);
                    });
                } else {
                    // slayer tasks
                    const taskID = this.parent.viewedDungeonID;
                    this.slayerTaskMonsters[taskID].forEach((monsterID: any) => {
                        dataSet.push(this.monsterSimData[monsterID]);
                    });
                }
                return dataSet;
            }

            /**
             * Finds the monsters/dungeons you can currently fight
             * @return {boolean[]}
             */
            getEnterSet() {
                const enterSet = [];
                // Compile data from monsters in combat zones
                for (const area of MICSR.combatAreas.allObjects) {
                    for (const monster of area.monsters) {
                        enterSet.push(true);
                    }
                }
                // Wandering Bard
                enterSet.push(true);
                // Check which slayer areas we can access with current stats and equipment
                for (const area of MICSR.slayerAreas.allObjects) {
                    // push `canEnter` for every monster in this zone
                    for (const monster of area.monsters) {
                        enterSet.push(this.parent.player.checkRequirements(area.entryRequirements));
                    }
                }
                // Perform simulation of monsters in dungeons and auto slayer
                MICSR.dungeonIDs.forEach((_: string) => {
                    enterSet.push(true);
                });
                MICSR.taskIDs.forEach((taskID: string) => this.slayerTaskMonsters[taskID].forEach((_: string) => {
                    enterSet.push(true);
                }));
                return enterSet;
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
    waitLoadOrder(reqs, setup, 'Simulator');

})();