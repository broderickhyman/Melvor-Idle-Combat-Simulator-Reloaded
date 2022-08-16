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
         * Class to handle data exporting
         */
        MICSR.DataExport = class {
            constructor(app) {
                this.app = app;
                this.simulator = this.app.simulator;
                // Data Export Settings
                this.exportOptions = {
                    dungeonMonsters: true,
                    nonSimmed: false,
                }
                this.header = Object.getOwnPropertyNames(this.app.manager.convertSlowSimToResult(this.app.manager.getSimStats())).filter(prop =>
                    ![
                        'simSuccess',
                        'reason',
                        'inQueue',
                    ].includes(prop)
                );
            }

            skip(filter, data) {
                if (this.exportOptions.nonSimmed) {
                    return false;
                }
                return !filter || !data.simSuccess;
            }

            exportEntity(exportData, exportIdx, filter, info, data) {
                if (this.skip(filter, data)) {
                    return;
                }
                exportData[exportIdx] = {
                    ...info,
                    data: this.header.map(prop => this.round(data[prop])),
                }
            }

            round(x) {
                if (x === undefined || x === null) {
                    return x;
                }
                if ((x).toString() === '[object Object]') {
                    const result = {};
                    Object.getOwnPropertyNames(x).forEach(prop => result[prop] = this.round(x[prop]));
                    return result;
                } else if (!isNaN) {
                    return x;
                }
                return Math.round(x * 1e4) / 1e4;
            }

            exportData() {
                // result
                const exportData = {
                    header: this.header,
                    // monsters in zones, or tasks
                    monsters: {},
                    // dungeons
                    dungeons: {},
                    dungeonMonsters: {},
                    // auto slayer
                    autoSlayer: {},
                }

                // export Combat Areas, Wandering Bard, and Slayer Areas
                this.app.monsterIDs.forEach(monsterID => this.exportEntity(
                    exportData.monsters,
                    monsterID,
                    this.simulator.monsterSimFilter[monsterID],
                    {
                        name: this.app.getMonsterName(monsterID),
                        monsterID: monsterID
                    },
                    this.simulator.monsterSimData[monsterID],
                ));

                // export dungeons
                MICSR.dungeons.forEach((dungeon, dungeonID) => {
                    if (this.skip(
                        this.simulator.dungeonSimFilter[dungeonID],
                        this.simulator.dungeonSimData[dungeonID],
                    )) {
                        return;
                    }
                    // dungeon
                    this.exportEntity(
                        exportData.dungeons,
                        dungeonID,
                        this.simulator.dungeonSimFilter[dungeonID],
                        {
                            name: this.app.getDungeonName(dungeonID),
                            dungeonID: dungeonID,
                        },
                        this.simulator.dungeonSimData[dungeonID],
                    );
                    // dungeon monsters
                    if (this.exportOptions.dungeonMonsters) {
                        exportData.dungeonMonsters[dungeonID] = {},
                            dungeon.monsters.forEach(monsterID => this.exportEntity(
                                exportData.dungeonMonsters[dungeonID],
                                monsterID,
                                this.simulator.dungeonSimFilter[dungeonID],
                                {
                                    name: this.app.getMonsterName(monsterID),
                                    dungeonID: dungeonID,
                                    monsterID: monsterID,
                                },
                                this.simulator.monsterSimData[this.simulator.simID(monsterID, dungeonID)],
                            ));
                    }
                });

                // export slayer tasks
                SlayerTask.data.forEach((task, taskID) => {
                    if (this.skip(
                        this.simulator.slayerSimFilter[taskID],
                        this.simulator.slayerSimData[taskID],
                    )) {
                        return;
                    }
                    // task list
                    this.exportEntity(
                        exportData.autoSlayer,
                        taskID,
                        this.simulator.slayerSimFilter[taskID],
                        {
                            name: task.display,
                            taskID: taskID,
                            monsterList: this.simulator.slayerTaskMonsters[taskID],
                        },
                        this.simulator.slayerSimData[taskID],
                    );
                    // task monsters
                    this.simulator.slayerTaskMonsters[taskID].forEach(monsterID => {
                        this.exportEntity(
                            exportData.monsters,
                            monsterID,
                            true,
                            {
                                name: this.app.getMonsterName(monsterID),
                                monsterID: monsterID,
                            },
                            this.simulator.monsterSimData[monsterID],
                        );
                    });
                });
                return JSON.stringify(exportData);
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
    waitLoadOrder(reqs, setup, 'DataExport');

})();