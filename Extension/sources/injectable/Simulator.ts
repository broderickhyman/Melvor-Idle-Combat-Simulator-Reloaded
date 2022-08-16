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

            /**
             *
             * @param {McsApp} parent Reference to container class
             * @param {string} workerURL URL to simulator web worker
             */
            constructor(parent: any, workerURL: any) {
                this.parent = parent;
                // Simulation settings
                /** @type {boolean[]} */
                this.monsterSimFilter = [];
                /** @type {boolean[]} */
                this.dungeonSimFilter = [];
                this.slayerSimFilter = [];
                // not simulated reason
                this.notSimulatedReason = 'entity not simulated';
                // Simulation data;
                /** @type {Object} */
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
                this.monsterSimData = {};
                // @ts-expect-error TS(2552): Cannot find name 'MONSTERS'. Did you mean 'monster... Remove this comment to see the full error message
                for (let monsterID = 0; monsterID < MONSTERS.length; monsterID++) {
                    this.monsterSimData[monsterID] = this.newSimData(true);
                    this.monsterSimFilter.push(true);
                }
                /** @type {MonsterSimResult[]} */
                this.dungeonSimData = [];
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    this.dungeonSimData.push(this.newSimData(false));
                    this.dungeonSimFilter.push(true);
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID: any) => {
                        const simID = this.simID(monsterID, dungeonID);
                        if (!this.monsterSimData[simID]) {
                            this.monsterSimData[simID] = this.newSimData(true);
                        }
                    });
                }
                //
                this.slayerTaskMonsters = [];
                this.slayerSimData = [];
                // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
                for (let taskID = 0; taskID < SlayerTask.data.length; taskID++) {
                    this.slayerTaskMonsters.push([]);
                    this.slayerSimData.push(this.newSimData(false));
                    this.slayerSimFilter.push(true);
                }
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
                /** @type {SimulationJob[]} */
                this.simulationQueue = [];
                /** @type {SimulationWorker[]} */
                this.simulationWorkers = [];
                this.maxThreads = window.navigator.hardwareConcurrency;
                this.simStartTime = 0;
                /** If the current sim has been cancelled */
                this.simCancelled = false;
                // Create Web workers
                this.createWorkers();
            }

            /**
             * Initializes a performance test
             * @param {number} numSims number of simulations to run in a row
             * @memberof McsSimulator
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
                // clone data without DOM references or functions
                const equipmentSlotDataClone = {};
                // @ts-expect-error TS(2304): Cannot find name 'equipmentSlotData'.
                for (const slot in equipmentSlotData) {
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    equipmentSlotDataClone[slot] = {
                        // @ts-expect-error TS(2304): Cannot find name 'equipmentSlotData'.
                        ...equipmentSlotData[slot],
                        imageElements: [],
                        qtyElements: [],
                        tooltips: [],
                    }
                }
                const modifierDataClone = {};
                const cloneBackupMethods = [
                    {
                        name: 'MICSR.divideByNumberMultiplier',
                        // @ts-expect-error TS(2304): Cannot find name 'divideByNumberMultiplier'.
                        data: divideByNumberMultiplier.toString().replace('function ', 'MICSR.').replace(/(\(.*\)){/, ' = $1 => {')
                    },
                    {
                        name: 'MICSR.milliToSeconds',
                        // @ts-expect-error TS(2304): Cannot find name 'milliToSeconds'.
                        data: milliToSeconds.toString().replace('function ', 'MICSR.').replace(/(\(.*\)){/, ' = $1 => {')
                    },
                    {
                        name: 'MICSR.multiplyByNumberMultiplier',
                        // @ts-expect-error TS(2304): Cannot find name 'multiplyByNumberMultiplier'.
                        data: multiplyByNumberMultiplier.toString().replace('function ', 'MICSR.').replace(/(\(.*\)){/, ' = $1 => {')
                    },
                ]
                // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                for (const slot in modifierData) {
                    // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                    const modifyValue = modifierData[slot].modifyValue?.name;
                    if (modifyValue === 'modifyValue') {
                        cloneBackupMethods.push({
                            name: `MICSR.${slot}ModifyValue`,
                            // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                            data: `MICSR.${slot}ModifyValue=${modifierData[slot].modifyValue.toString()}`
                        });
                    }
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    modifierDataClone[slot] = {
                        // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                        ...modifierData[slot],
                        format: '',
                        modifyValue: modifyValue,
                    }
                }
                // clone itemConditionalModifiers
                const itemConditionalModifiersClone = [
                    // @ts-expect-error TS(2304): Cannot find name 'itemConditionalModifiers'.
                    ...itemConditionalModifiers,
                ];
                for (let i = 0; i < itemConditionalModifiersClone.length; i++) {
                    itemConditionalModifiersClone[i] = {...itemConditionalModifiersClone[i]};
                    itemConditionalModifiersClone[i].conditionals = [...itemConditionalModifiersClone[i].conditionals];
                    for (let j = 0; j < itemConditionalModifiersClone[i].conditionals.length; j++) {
                        const condition = itemConditionalModifiersClone[i].conditionals[j].condition.toString();
                        itemConditionalModifiersClone[i].conditionals[j] = {
                            ...itemConditionalModifiersClone[i].conditionals[j],
                        };
                        itemConditionalModifiersClone[i].conditionals[j].condition = condition;
                        cloneBackupMethods.push({
                            name: `MICSR["itemConditionalModifiers-condition-${i}-${j}"]`,
                            data: `MICSR["itemConditionalModifiers-condition-${i}-${j}"]=${condition}`,
                            // @ts-expect-error TS(2345): Argument of type '{ name: string; data: string; co... Remove this comment to see the full error message
                            condition: condition,
                        });
                    }
                }
                // clone SUMMONING
                const summoningClone = {
                    // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
                    marks: Summoning.marks,
                };
                (summoningClone as any).synergies = [];
                let synergyIndex = 0;
                // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
                for (const synergy of Summoning.synergies) {
                    const synergyClone = {...synergy};
                    if (synergyClone.conditionalModifiers) {
                        synergyClone.conditionalModifiers = [...synergyClone.conditionalModifiers];
                        for (let k = 0; k < synergyClone.conditionalModifiers.length; k++) {
                            const condition = synergyClone.conditionalModifiers[k].condition.toString();
                            synergyClone.conditionalModifiers[k] = {
                                ...synergyClone.conditionalModifiers[k],
                                condition: condition,
                            };
                            cloneBackupMethods.push({
                                name: `MICSR["SUMMONING-conditional-${synergyIndex}-${k}"]`,
                                data: `MICSR["SUMMONING-conditional-${synergyIndex}-${k}"]=${condition}`,
                                // @ts-expect-error TS(2345): Argument of type '{ name: string; data: string; co... Remove this comment to see the full error message
                                condition: condition,
                            });
                        }
                    }
                    (summoningClone as any).synergies.push(synergyClone);
                    synergyIndex++;
                }
                // clone itemSynergies
                const itemSynergiesClone: any = [];
                // @ts-expect-error TS(2304): Cannot find name 'itemSynergies'.
                itemSynergies.forEach((synergy: any, i: any) => {
                    const clone = {...synergy};
                    if (synergy.conditionalModifiers) {
                        clone.conditionalModifiers = [];
                        synergy.conditionalModifiers.forEach((conditionalModifier: any, j: any) => {
                            const condition = conditionalModifier.condition.toString();
                            clone.conditionalModifiers.push({
                                ...conditionalModifier,
                                condition: condition,
                            })
                            cloneBackupMethods.push({
                                name: `MICSR["itemSynergies-conditional-${i}-${j}"]`,
                                data: `MICSR["itemSynergies-conditional-${i}-${j}"]=${condition}`,
                                // @ts-expect-error TS(2345): Argument of type '{ name: string; data: string; co... Remove this comment to see the full error message
                                condition: condition,
                            });
                        });
                    }
                    itemSynergiesClone.push(clone);
                });
                // fix conditionals that are created by a function
                const backupsToReplace = [
                    // @ts-expect-error TS(2304): Cannot find name 'bankCondition'.
                    bankCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'gloveCondition'.
                    gloveCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'playerHitpointsBelowCondition'.
                    playerHitpointsBelowCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'playerHitpointsAboveCondition'.
                    playerHitpointsAboveCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'playerHasDotCondition'.
                    playerHasDotCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'enemyHasDotCondition'.
                    enemyHasDotCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'playerHasEffectCondition'.
                    playerHasEffectCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'enemyHasEffectCondition'.
                    enemyHasEffectCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'typeVsTypeCondition'.
                    typeVsTypeCondition().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'allConditions'.
                    allConditions().toString(),
                    // @ts-expect-error TS(2304): Cannot find name 'anyCondition'.
                    anyCondition().toString(),
                ];
                const replacements = {
                    'MICSR["itemConditionalModifiers-condition-0-0"]': "(player)=>{return true;}", // bankCondition
                    'MICSR["itemConditionalModifiers-condition-1-0"]': "playerHitpointsBelowCondition(50)",
                    'MICSR["itemConditionalModifiers-condition-2-0"]': "(player)=>{return true;}", // glove condition
                    'MICSR["itemConditionalModifiers-condition-3-0"]': "(player)=>{return true;}", // glove condition
                    'MICSR["itemConditionalModifiers-condition-4-0"]': "(player)=>{return true;}", // glove condition
                    'MICSR["itemConditionalModifiers-condition-5-0"]': "(player)=>{return true;}", // glove condition
                    'MICSR["itemConditionalModifiers-condition-6-0"]': "(player)=>{return true;}", // glove condition
                    'MICSR["itemConditionalModifiers-condition-7-0"]': "playerHitpointsBelowCondition(100)",
                    'MICSR["itemConditionalModifiers-condition-8-0"]': "typeVsTypeCondition('melee', 'ranged')",
                    'MICSR["itemConditionalModifiers-condition-9-0"]': "typeVsTypeCondition('ranged', 'magic')",
                    'MICSR["itemConditionalModifiers-condition-10-0"]': "typeVsTypeCondition('magic', 'melee')",
                    'MICSR["SUMMONING-conditional-9-0"]': "playerHitpointsAboveCondition(100)",
                    'MICSR["SUMMONING-conditional-9-1"]': "playerHitpointsAboveCondition(100)",
                    'MICSR["SUMMONING-conditional-53-0"]': "enemyHasDotCondition('Burn')",
                    'MICSR["itemSynergies-conditional-3-0"]': "playerHasDotCondition('Poison')",
                    'MICSR["itemSynergies-conditional-3-1"]': "enemyHasDotCondition('Poison')",
                    'MICSR["itemSynergies-conditional-4-0"]': "anyCondition([" +
                        "playerHasEffectCondition(ModifierEffectSubtype.Slow)," +
                        "playerHasEffectCondition(ModifierEffectSubtype.Frostburn)," +
                        "playerHasDotCondition('Burn')," +
                        "])",
                    'MICSR["itemSynergies-conditional-5-0"]': "playerHasDotCondition('Bleed')",
                }
                for (const backup of cloneBackupMethods) {
                    if (backupsToReplace.includes((backup as any).condition)) {
                        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        if (replacements[backup.name]) {
                            // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            backup.data = `${backup.name}=${replacements[backup.name]}`;
                        } else {
                            MICSR.warn('Unexpected conditional method', backup.name, (backup as any).condition);
                        }
                    }
                }
                // constants
                const constantNames = [
                    // actual constants
                    // @ts-expect-error TS(2304): Cannot find name 'afflictionEffect'.
                    {name: 'afflictionEffect', data: afflictionEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'Agility'.
                    {name: 'Agility', data: {obstacles: Agility.obstacles, passivePillars: Agility.passivePillars}},
                    // @ts-expect-error TS(2304): Cannot find name 'ANCIENT'.
                    {name: 'ANCIENT', data: ANCIENT},
                    // @ts-expect-error TS(2304): Cannot find name 'attacks'.
                    {name: 'attacks', data: attacks},
                    // @ts-expect-error TS(2304): Cannot find name 'attacksIDMap'.
                    {name: 'attacksIDMap', data: attacksIDMap},
                    // @ts-expect-error TS(2304): Cannot find name 'attackStyles'.
                    {name: 'attackStyles', data: attackStyles},
                    // @ts-expect-error TS(2304): Cannot find name 'AttackStyles'.
                    {name: 'AttackStyles', data: AttackStyles},
                    // @ts-expect-error TS(2304): Cannot find name 'AURORAS'.
                    {name: 'AURORAS', data: AURORAS},
                    // @ts-expect-error TS(2304): Cannot find name 'bleedReflectEffect'.
                    {name: 'bleedReflectEffect', data: bleedReflectEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'burnEffect'.
                    {name: 'burnEffect', data: burnEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'combatAreas'.
                    {name: 'combatAreas', data: combatAreas},
                    {
                        name: 'combatMenus', data: {
                            progressBars: {},
                        }
                    },
                    // @ts-expect-error TS(2304): Cannot find name 'combatPassives'.
                    {name: 'combatPassives', data: combatPassives},
                    // @ts-expect-error TS(2304): Cannot find name 'combatSkills'.
                    {name: 'combatSkills', data: combatSkills},
                    {name: 'CombatStats', data: {}},
                    // @ts-expect-error TS(2304): Cannot find name 'combatTriangle'.
                    {name: 'combatTriangle', data: combatTriangle},
                    // @ts-expect-error TS(2304): Cannot find name 'CONSTANTS'.
                    {name: 'CONSTANTS', data: CONSTANTS},
                    // @ts-expect-error TS(2304): Cannot find name 'CURSES'.
                    {name: 'CURSES', data: CURSES},
                    // @ts-expect-error TS(2304): Cannot find name 'DotTypeIDs'.
                    {name: 'DotTypeIDs', data: DotTypeIDs},
                    // @ts-expect-error TS(2304): Cannot find name 'Dungeons'.
                    {name: 'Dungeons', data: Dungeons},
                    // @ts-expect-error TS(2304): Cannot find name 'DUNGEONS'.
                    {name: 'DUNGEONS', data: DUNGEONS},
                    {name: 'effectMedia', data: {}},
                    // @ts-expect-error TS(2304): Cannot find name 'elementalEffects'.
                    {name: 'elementalEffects', data: elementalEffects},
                    // @ts-expect-error TS(2304): Cannot find name 'emptyFood'.
                    {name: 'emptyFood', data: emptyFood},
                    {name: 'enemyHTMLElements', data: {}},
                    // @ts-expect-error TS(2304): Cannot find name 'emptyItem'.
                    {name: 'emptyItem', data: emptyItem},
                    // @ts-expect-error TS(2304): Cannot find name 'enemyNoun'.
                    {name: 'enemyNoun', data: enemyNoun},
                    // @ts-expect-error TS(2304): Cannot find name 'EquipmentSlots'.
                    {name: 'EquipmentSlots', data: EquipmentSlots},
                    {name: 'equipmentSlotData', data: equipmentSlotDataClone},
                    // @ts-expect-error TS(2304): Cannot find name 'formatNumberSetting'.
                    {name: 'formatNumberSetting', data: formatNumberSetting},
                    // @ts-expect-error TS(2304): Cannot find name 'frostBurnEffect'.
                    {name: 'frostBurnEffect', data: frostBurnEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'GAMEMODES'.
                    {name: 'GAMEMODES', data: GAMEMODES},
                    // @ts-expect-error TS(2304): Cannot find name 'GeneralShopPurchases'.
                    {name: 'GeneralShopPurchases', data: GeneralShopPurchases},
                    {name: 'gp', data: 1e9}, // required for confetti crossbow
                    // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                    {name: 'Herblore', data: {potions: Herblore.potions}},
                    // @ts-expect-error TS(2304): Cannot find name 'markOfDeathEffect'.
                    {name: 'markOfDeathEffect', data: markOfDeathEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'ModifierTarget'.
                    {name: 'ModifierTarget', data: ModifierTarget},
                    {name: 'MonsterStats', data: {}},
                    {name: 'itemConditionalModifiers', data: itemConditionalModifiersClone},
                    // @ts-expect-error TS(2304): Cannot find name 'items'.
                    {name: 'items', data: items},
                    // @ts-expect-error TS(2304): Cannot find name 'Items'.
                    {name: 'Items', data: Items},
                    {name: 'ItemStats', data: {}},
                    {name: 'itemSynergies', data: itemSynergiesClone},
                    {name: 'modifierData', data: modifierDataClone},
                    // @ts-expect-error TS(2304): Cannot find name 'ModifierEffectSubtype'.
                    {name: 'ModifierEffectSubtype', data: ModifierEffectSubtype},
                    // @ts-expect-error TS(2304): Cannot find name 'Monsters'.
                    {name: 'Monsters', data: Monsters},
                    // @ts-expect-error TS(2304): Cannot find name 'MONSTERS'.
                    {name: 'MONSTERS', data: MONSTERS},
                    // @ts-expect-error TS(2304): Cannot find name 'PETS'.
                    {name: 'PETS', data: PETS},
                    {name: 'playerHTMLElements', data: {}},
                    // @ts-expect-error TS(2304): Cannot find name 'poisonEffect'.
                    {name: 'poisonEffect', data: poisonEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'PRAYER'.
                    {name: 'PRAYER', data: PRAYER},
                    // @ts-expect-error TS(2304): Cannot find name 'Prayers'.
                    {name: 'Prayers', data: Prayers},
                    {name: 'PrayerStats', data: {}},
                    {
                        name: 'SETTINGS', data: {
                            performance: {},
                        }
                    },
                    // @ts-expect-error TS(2304): Cannot find name 'SHOP'.
                    {name: 'SHOP', data: SHOP},
                    // @ts-expect-error TS(2304): Cannot find name 'Skills'.
                    {name: 'Skills', data: Skills},
                    // @ts-expect-error TS(2304): Cannot find name 'SKILLS'.
                    {name: 'SKILLS', data: SKILLS},
                    // @ts-expect-error TS(2304): Cannot find name 'slayerAreas'.
                    {name: 'slayerAreas', data: slayerAreas},
                    // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
                    {name: 'slayerTaskData', data: SlayerTask.data},
                    // @ts-expect-error TS(2304): Cannot find name 'SpellTypes'.
                    {name: 'SpellTypes', data: SpellTypes},
                    // @ts-expect-error TS(2304): Cannot find name 'SPELLS'.
                    {name: 'SPELLS', data: SPELLS},
                    // @ts-expect-error TS(2304): Cannot find name 'stackingEffects'.
                    {name: 'stackingEffects', data: stackingEffects},
                    {name: 'Stats', data: {}},
                    {name: 'synergyElements', data: {}},
                    // @ts-expect-error TS(2304): Cannot find name 'SynergyItem'.
                    {name: 'SynergyItem', data: SynergyItem},
                    {name: 'Summoning', data: summoningClone},
                    // @ts-expect-error TS(2304): Cannot find name 'TICK_INTERVAL'.
                    {name: 'TICK_INTERVAL', data: TICK_INTERVAL},
                    // @ts-expect-error TS(2304): Cannot find name 'tutorialComplete'.
                    {name: 'tutorialComplete', data: tutorialComplete},
                    // @ts-expect-error TS(2304): Cannot find name 'unknownArea'.
                    {name: 'unknownArea', data: unknownArea},
                    // @ts-expect-error TS(2304): Cannot find name 'youNoun'.
                    {name: 'youNoun', data: youNoun},
                    // character settings  // TODO: sim setting
                    // @ts-expect-error TS(2304): Cannot find name 'currentGamemode'.
                    {name: 'currentGamemode', data: currentGamemode},
                    // @ts-expect-error TS(2304): Cannot find name 'numberMultiplier'.
                    {name: 'numberMultiplier', data: numberMultiplier},
                    // character data // TODO: wipe these from SimPlayer
                    {name: 'bank', data: []},
                    {name: 'bankCache', data: {}},
                    // @ts-expect-error TS(2304): Cannot find name 'skillLevel'.
                    {name: 'skillLevel', data: skillLevel},
                    // @ts-expect-error TS(2304): Cannot find name 'petUnlocked'.
                    {name: 'petUnlocked', data: petUnlocked},
                ];
                const constants: { [name: string]: string; } = {};
                constantNames.forEach(constant =>
                    constants[constant.name] = constant.data
                );
                // functions
                const functionNames = [
                    // global functions
                    // @ts-expect-error TS(2304): Cannot find name 'applyModifier'.
                    {name: 'applyModifier', data: applyModifier},
                    {
                        name: 'checkRequirements', data: (...args: any[]) => {/*console.log('checkRequirements', ...args); */
                            return true;
                        }
                    },
                    // @ts-expect-error TS(2304): Cannot find name 'allConditions'.
                    {name: 'allConditions', data: allConditions},
                    // @ts-expect-error TS(2304): Cannot find name 'anyCondition'.
                    {name: 'anyCondition', data: anyCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'clampValue'.
                    {name: 'clampValue', data: clampValue},
                    // @ts-expect-error TS(2304): Cannot find name 'damageReducer'.
                    {name: 'damageReducer', data: damageReducer},
                    // @ts-expect-error TS(2304): Cannot find name 'enemyHasDotCondition'.
                    {name: 'enemyHasDotCondition', data: enemyHasDotCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'enemyHasEffectCondition'.
                    {name: 'enemyHasEffectCondition', data: enemyHasEffectCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'formatNumber'.
                    {name: 'formatNumber', data: formatNumber},
                    // @ts-expect-error TS(2304): Cannot find name 'getAttackFromID'.
                    {name: 'getAttackFromID', data: getAttackFromID},
                    // @ts-expect-error TS(2304): Cannot find name 'getBankId'.
                    {name: 'getBankId', data: getBankId},
                    // @ts-expect-error TS(2304): Cannot find name 'Summoning'.
                    {name: 'getTabletConsumptionXP', data: Summoning.getTabletConsumptionXP},
                    // @ts-expect-error TS(2304): Cannot find name 'getDamageRoll'.
                    {name: 'getDamageRoll', data: getDamageRoll},
                    {name: 'getLangString', data: (key: any, id: any) => `${key}${id}`},
                    // @ts-expect-error TS(2304): Cannot find name 'getMonsterArea'.
                    {name: 'getMonsterArea', data: getMonsterArea},
                    // @ts-expect-error TS(2304): Cannot find name 'getMonsterCombatLevel'.
                    {name: 'getMonsterCombatLevel', data: getMonsterCombatLevel},
                    // @ts-expect-error TS(2304): Cannot find name 'getNumberMultiplierValue'.
                    {name: 'getNumberMultiplierValue', data: getNumberMultiplierValue},
                    // @ts-expect-error TS(2304): Cannot find name 'isEquipment'.
                    {name: 'isEquipment', data: isEquipment},
                    // @ts-expect-error TS(2304): Cannot find name 'isFood'.
                    {name: 'isFood', data: isFood},
                    // @ts-expect-error TS(2304): Cannot find name 'isSeedItem'.
                    {name: 'isSeedItem', data: isSeedItem},
                    // @ts-expect-error TS(2304): Cannot find name 'isSkillEntry'.
                    {name: 'isSkillEntry', data: isSkillEntry},
                    // @ts-expect-error TS(2304): Cannot find name 'isSkillLocked'.
                    {name: 'isSkillLocked', data: isSkillLocked},
                    // @ts-expect-error TS(2304): Cannot find name 'isWeapon'.
                    {name: 'isWeapon', data: isWeapon},
                    // @ts-expect-error TS(2304): Cannot find name 'maxDamageReducer'.
                    {name: 'maxDamageReducer', data: maxDamageReducer},
                    // @ts-expect-error TS(2304): Cannot find name 'numberWithCommas'.
                    {name: 'numberWithCommas', data: numberWithCommas},
                    // @ts-expect-error TS(2304): Cannot find name 'playerHasDotCondition'.
                    {name: 'playerHasDotCondition', data: playerHasDotCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'playerHasEffectCondition'.
                    {name: 'playerHasEffectCondition', data: playerHasEffectCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'playerHitpointsBelowCondition'.
                    {name: 'playerHitpointsBelowCondition', data: playerHitpointsBelowCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'playerHitpointsAboveCondition'.
                    {name: 'playerHitpointsAboveCondition', data: playerHitpointsAboveCondition},
                    // @ts-expect-error TS(2304): Cannot find name 'rollInteger'.
                    {name: 'rollInteger', data: rollInteger},
                    // @ts-expect-error TS(2304): Cannot find name 'rollPercentage'.
                    {name: 'rollPercentage', data: rollPercentage},
                    // @ts-expect-error TS(2304): Cannot find name 'roundToTickInterval'.
                    {name: 'roundToTickInterval', data: roundToTickInterval},
                    // @ts-expect-error TS(2304): Cannot find name 'typeVsTypeCondition'.
                    {name: 'typeVsTypeCondition', data: typeVsTypeCondition},
                    // MICSR functions
                    {
                        name: 'MICSR.addAgilityModifiers',
                        data: MICSR.addAgilityModifiers,
                    },
                    {
                        name: 'MICSR.getModifierValue',
                        data: MICSR.getModifierValue,
                    },
                ];
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
                // modify value cloned functions
                cloneBackupMethods.forEach(func => {
                    functions[func.name] = func.data;
                    functionNames.push(func)
                });
                // classes
                const classNames = [
                    // @ts-expect-error TS(2304): Cannot find name 'BankHelper'.
                    {name: 'BankHelper', data: BankHelper},
                    // @ts-expect-error TS(2304): Cannot find name 'CharacterStats'.
                    {name: 'CharacterStats', data: CharacterStats},
                    // @ts-expect-error TS(2304): Cannot find name 'CombatLoot'.
                    {name: 'CombatLoot', data: CombatLoot},
                    // @ts-expect-error TS(2304): Cannot find name 'DataReader'.
                    {name: 'DataReader', data: DataReader},
                    // @ts-expect-error TS(2304): Cannot find name 'Equipment'.
                    {name: 'Equipment', data: Equipment},
                    // @ts-expect-error TS(2304): Cannot find name 'EquipmentStats'.
                    {name: 'EquipmentStats', data: EquipmentStats},
                    // @ts-expect-error TS(2304): Cannot find name 'EquippedFood'.
                    {name: 'EquippedFood', data: EquippedFood},
                    // @ts-expect-error TS(2304): Cannot find name 'EquipSlot'.
                    {name: 'EquipSlot', data: EquipSlot},
                    {name: 'MICSR.ShowModifiers', data: MICSR.ShowModifiers},
                    // @ts-expect-error TS(2304): Cannot find name 'NotificationQueue'.
                    {name: 'NotificationQueue', data: NotificationQueue},
                    // @ts-expect-error TS(2304): Cannot find name 'PlayerStats'.
                    {name: 'PlayerStats', data: PlayerStats},
                    // @ts-expect-error TS(2304): Cannot find name 'TargetModifiers'.
                    {name: 'TargetModifiers', data: TargetModifiers},
                    // @ts-expect-error TS(2304): Cannot find name 'Timer'.
                    {name: 'Timer', data: Timer},
                    // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
                    {name: 'SlayerTask', data: SlayerTask},
                    // @ts-expect-error TS(2304): Cannot find name 'SlowEffect'.
                    {name: 'SlowEffect', data: SlowEffect},
                    // @ts-expect-error TS(2304): Cannot find name 'SplashManager'.
                    {name: 'SplashManager', data: SplashManager},
                    // PlayerModifiers extends CombatModifiers
                    // @ts-expect-error TS(2304): Cannot find name 'CombatModifiers'.
                    {name: 'CombatModifiers', data: CombatModifiers},
                    // @ts-expect-error TS(2304): Cannot find name 'PlayerModifiers'.
                    {name: 'PlayerModifiers', data: PlayerModifiers},
                    // SimManager extends CombatManager extends BaseManager
                    // @ts-expect-error TS(2304): Cannot find name 'BaseManager'.
                    {name: 'BaseManager', data: BaseManager},
                    // @ts-expect-error TS(2304): Cannot find name 'CombatManager'.
                    {name: 'CombatManager', data: CombatManager},
                    {name: 'MICSR.SimManager', data: MICSR.SimManager},
                    // SimPlayer extends Player extends Character
                    // SimEnemy extends Enemy extends Character
                    // @ts-expect-error TS(2304): Cannot find name 'Character'.
                    {name: 'Character', data: Character},
                    // @ts-expect-error TS(2304): Cannot find name 'Player'.
                    {name: 'Player', data: Player},
                    {name: 'MICSR.SimPlayer', data: MICSR.SimPlayer},
                    // @ts-expect-error TS(2304): Cannot find name 'Enemy'.
                    {name: 'Enemy', data: Enemy},
                    {name: 'MICSR.SimEnemy', data: MICSR.SimEnemy},
                ];
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
                } else if (this.parent.isViewingDungeon && this.parent.viewedDungeonID < MICSR.dungeons.length) {
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
                    taskID = this.parent.barMonsterIDs[this.parent.selectedBar] - MICSR.dungeons.length;
                } else if (this.parent.isViewingDungeon && this.parent.viewedDungeonID >= MICSR.dungeons.length) {
                    taskID = this.parent.viewedDungeonID - MICSR.dungeons.length;
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
                // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
                const task = SlayerTask.data[i];
                this.slayerTaskMonsters[i] = [];
                if (!this.slayerSimFilter[i]) {
                    return;
                }
                const minLevel = task.minLevel;
                const maxLevel = task.maxLevel === -1 ? 6969 : task.maxLevel;
                // @ts-expect-error TS(2304): Cannot find name 'MONSTERS'.
                for (let monsterID = 0; monsterID < MONSTERS.length; monsterID++) {
                    // check if it is a slayer monster
                    // @ts-expect-error TS(2304): Cannot find name 'MONSTERS'.
                    if (!MONSTERS[monsterID].canSlayer) {
                        continue;
                    }
                    // check if combat level fits the current task type
                    // @ts-expect-error TS(2304): Cannot find name 'getMonsterCombatLevel'.
                    const cbLevel = getMonsterCombatLevel(monsterID);
                    if (cbLevel < minLevel || cbLevel > maxLevel) {
                        continue;
                    }
                    // check if the area is accessible, this only works for auto slayer
                    // without auto slayer you can get some tasks for which you don't wear/own the gear
                    // @ts-expect-error TS(2304): Cannot find name 'getMonsterArea'.
                    let area = getMonsterArea(monsterID);
                    if (!this.parent.player.checkRequirements(area.entryRequirements)) {
                        continue;
                    }
                    // all checks passed
                    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                    this.pushMonsterToQueue(monsterID);
                    this.slayerTaskMonsters[i].push(monsterID);
                }
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
                const bardID = 139;
                if (this.monsterSimFilter[bardID]) {
                    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
                    this.pushMonsterToQueue(bardID);
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
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    if (this.dungeonSimFilter[dungeonID]) {
                        for (let j = 0; j < MICSR.dungeons[dungeonID].monsters.length; j++) {
                            const monsterID = MICSR.dungeons[dungeonID].monsters[j];
                            this.pushMonsterToQueue(monsterID, dungeonID);
                        }
                    }
                }
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

            computeAverageSimData(filter: any, data: any, monsterIDs: any, dungeonID: any) {
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
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    this.computeAverageSimData(this.dungeonSimFilter[dungeonID], this.dungeonSimData[dungeonID], MICSR.dungeons[dungeonID].monsters, dungeonID);
                }
                for (let slayerTaskID = 0; slayerTaskID < this.slayerTaskMonsters.length; slayerTaskID++) {
                    // @ts-expect-error TS(2554): Expected 4 arguments, but got 3.
                    this.computeAverageSimData(this.slayerSimFilter[slayerTaskID], this.slayerSimData[slayerTaskID], this.slayerTaskMonsters[slayerTaskID]);
                    // correct average kps for auto slayer
                    this.slayerSimData[slayerTaskID].killsPerSecond *= this.slayerTaskMonsters[slayerTaskID].length;
                }
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
                    this.parent.monsterIDs.forEach((monsterID: any) => {
                        dataSet.push(this.getBarValue(this.monsterSimFilter[monsterID], this.monsterSimData[monsterID], keyValue));
                    });
                    // Perform simulation of monsters in dungeons
                    for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                        dataSet.push(this.getBarValue(this.dungeonSimFilter[dungeonID], this.dungeonSimData[dungeonID], keyValue));
                    }
                    // Perform simulation of monsters in slayer tasks
                    for (let taskID = 0; taskID < this.slayerTaskMonsters.length; taskID++) {
                        dataSet.push(this.getBarValue(this.slayerSimFilter[taskID], this.slayerSimData[taskID], keyValue));
                    }
                } else if (this.parent.viewedDungeonID < MICSR.dungeons.length) {
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
                    const taskID = this.parent.viewedDungeonID - MICSR.dungeons.length;
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
                const dataSet = [];
                if (!this.parent.isViewingDungeon) {
                    // Compile data from monsters in combat zones
                    this.parent.monsterIDs.forEach((monsterID: any) => {
                        dataSet.push(this.monsterSimData[monsterID]);
                    });
                    // Perform simulation of monsters in dungeons
                    for (let i = 0; i < MICSR.dungeons.length; i++) {
                        dataSet.push(this.dungeonSimData[i]);
                    }
                    // Perform simulation of monsters in slayer tasks
                    for (let i = 0; i < this.slayerTaskMonsters.length; i++) {
                        dataSet.push(this.slayerSimData[i]);
                    }
                } else if (this.parent.viewedDungeonID < MICSR.dungeons.length) {
                    // dungeons
                    const dungeonID = this.parent.viewedDungeonID;
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID: any) => {
                        dataSet.push(this.monsterSimData[this.simID(monsterID, dungeonID)]);
                    });
                } else {
                    // slayer tasks
                    const taskID = this.parent.viewedDungeonID - MICSR.dungeons.length;
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
                // @ts-expect-error TS(2304): Cannot find name 'combatAreas'.
                for (let i = 0; i < combatAreas.length; i++) {
                    // @ts-expect-error TS(2304): Cannot find name 'combatAreas'.
                    for (let j = 0; j < combatAreas[i].monsters.length; j++) {
                        enterSet.push(true);
                    }
                }
                // Wandering Bard
                enterSet.push(true);
                // Check which slayer areas we can access with current stats and equipment
                // @ts-expect-error TS(2304): Cannot find name 'slayerAreas'.
                for (const area of slayerAreas) {
                    // push `canEnter` for every monster in this zone
                    for (let j = 0; j < area.monsters.length; j++) {
                        enterSet.push(this.parent.player.checkRequirements(area.entryRequirements));
                    }
                }
                // Perform simulation of monsters in dungeons and auto slayer
                for (let i = 0; i < MICSR.dungeons.length; i++) {
                    enterSet.push(true);
                }
                for (let i = 0; i < this.slayerTaskMonsters.length; i++) {
                    enterSet.push(true);
                }
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
    waitLoadOrder(reqs, setup, 'Simulator');

})();