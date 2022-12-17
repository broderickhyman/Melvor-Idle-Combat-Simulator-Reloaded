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

        // global combat simulator object
        const MICSR = (window as any).MICSR;

        // combat sim name
        MICSR.name = 'Melvor Idle Combat Simulator Reloaded';
        MICSR.shortName = 'Combat Simulator';

        // compatible game version
        MICSR.gameVersion = 'v1.1';

        // combat sim version
        MICSR.majorVersion = 1;
        MICSR.minorVersion = 7;
        MICSR.patchVersion = 0;
        MICSR.preReleaseVersion = undefined;
        MICSR.version = `v${MICSR.majorVersion}.${MICSR.minorVersion}.${MICSR.patchVersion}`;
        if (MICSR.preReleaseVersion !== undefined) {
            MICSR.version = `${MICSR.version}-${MICSR.preReleaseVersion}`;
        }

        MICSR.versionCheck = (exact: any, major: any, minor: any, patch: any, prerelease: any) => {
            // check exact version match
            if (major === MICSR.majorVersion
                && minor === MICSR.minorVersion
                && patch === MICSR.patchVersion
                && prerelease === MICSR.preReleaseVersion) {
                return true;
            }
            if (exact) {
                // exact match is required
                return false;
            }
            // check minimal version match
            if (major !== MICSR.majorVersion) {
                return major < MICSR.majorVersion;
            }
            if (minor !== MICSR.minorVersion) {
                return minor < MICSR.minorVersion;

            }
            if (patch !== MICSR.patchVersion) {
                return patch < MICSR.patchVersion;
            }
            if (MICSR.preReleaseVersion !== undefined) {
                if (prerelease === undefined) {
                    // requires release version
                    return false;
                }
                return prerelease < MICSR.preReleaseVersion;
            }
            // this is release version, and either pre-release or release is required, so we're good
            return true;
        }

        MICSR.dataPackage = {};
        MICSR.fetchDataPackage = (id: string, url: string) => {
            // @ts-ignore
            return __awaiter(this, void 0, void 0, function* () {
                const headers = new Headers();
                headers.append('Content-Type', 'application/json');
                // @ts-ignore
                const response = yield fetch(url, {
                    method: 'GET',
                    headers,
                });
                if (!response.ok)
                    throw new Error(`Could not fetch data package with URL: ${url}`);
                // @ts-ignore
                MICSR.dataPackage[id] = (yield response.json());
                MICSR.cleanupDataPackage[id]();
            });
        }
        MICSR.cleanupDataPackage = {};
        MICSR.cleanupDataPackage.any = (id: string) => {
            MICSR.dataPackage[id].data.lore = undefined;
        }
        MICSR.cleanupDataPackage.Demo = () => {
            MICSR.cleanupDataPackage.any('Demo');
            MICSR.dataPackage.Demo.data.tutorialStages = undefined;
            MICSR.dataPackage.Demo.data.tutorialStageOrder = undefined;
            const bannedSkills = ['Woodcutting', 'Firemaking', 'Fishing', 'Mining', 'Cooking', 'Smithing', 'Farming', 'Summoning'];
            MICSR.dataPackage.Demo.data.skillData = MICSR.dataPackage.Demo.data.skillData
                .filter((x: any) => !bannedSkills.map((bannedSkill: string) => `melvorD:${bannedSkill}`).includes(x.skillID))
        };
        MICSR.cleanupDataPackage.Full = () => {
            MICSR.cleanupDataPackage.any('Full');
        };
        MICSR.cleanupDataPackage.TotH = () => {
            MICSR.cleanupDataPackage.any('TotH');
        };

        // any setup that does not require a game object
        MICSR.setupData = () => {
            // simulation settings
            MICSR.trials = 1e3;
            MICSR.maxTicks = 1e3;
            // @ts-expect-error TS(2304): Cannot find name 'cloudManager'.
            MICSR.cloudManager = cloudManager;
            // @ts-expect-error TS(2304): Cannot find name 'DATA_VERSION'.
            MICSR.DATA_VERSION = DATA_VERSION;
            // @ts-expect-error TS(2304): Cannot find name 'BinaryWriter'.
            MICSR.BinaryWriter = BinaryWriter;
            // @ts-expect-error TS(2304): Cannot find name 'SaveWriter'.
            MICSR.SaveWriter = SaveWriter;
            // @ts-expect-error TS(2304): Cannot find name 'currentSaveVersion'.
            MICSR.currentSaveVersion = currentSaveVersion;
            // @ts-expect-error TS(2304): Cannot find name 'EquipmentSlots'.
            MICSR.EquipmentSlots = EquipmentSlots;
            // @ts-expect-error TS(2304): Cannot find name 'equipmentSlotData'.
            MICSR.equipmentSlotData = equipmentSlotData;
            // @ts-expect-error TS(2304): Cannot find name 'SlayerTask'.
            MICSR.slayerTaskData = SlayerTask.data;
            MICSR.taskIDs = MICSR.slayerTaskData.map((task: any) => task.display);
            // @ts-expect-error TS(2304): Cannot find name 'notifyPlayer'.
            MICSR.imageNotify = imageNotify;
        }
        MICSR.setupData();
        MICSR.fetchDataPackage('Demo', `assets/data/melvorDemo.json?${MICSR.DATA_VERSION}`);
        if (MICSR.cloudManager.hasFullVersionEntitlement) {
            MICSR.fetchDataPackage('Full', `assets/data/melvorFull.json?${MICSR.DATA_VERSION}`);
        }
        if (MICSR.cloudManager.hasTotHEntitlement) {
            MICSR.fetchDataPackage('TotH', `assets/data/melvorTotH.json?${MICSR.DATA_VERSION}`);
        }
        MICSR.fetching = () => {
            if (MICSR.dataPackage.Demo === undefined) {
                return true;
            }
            if (MICSR.cloudManager.hasFullVersionEntitlement && MICSR.dataPackage.Full === undefined) {
                return true;
            }
            if (MICSR.cloudManager.hasTotHEntitlement && MICSR.dataPackage.TotH === undefined) {
                return true;
            }
            return false;
        }
        MICSR.setupFetchedData = (game: any) => {
            game.registerDataPackage(MICSR.dataPackage.Demo);
            if (MICSR.cloudManager.hasFullVersionEntitlement) {
                game.registerDataPackage(MICSR.dataPackage.Full);
            }
            if (MICSR.cloudManager.hasTotHEntitlement) {
                game.registerDataPackage(MICSR.dataPackage.TotH);
            }
        }

        // any setup that requires a game object
        MICSR.setupGame = (game: any) => {
            MICSR.actualGame = game;
            MICSR.game = MICSR.actualGame; // TODO this should be a mock game object probably
            MICSR.namespace = MICSR.game.registeredNamespaces.registeredNamespaces.get('micsr');
            if (MICSR.namespace === undefined) {
                MICSR.namespace = MICSR.game.registeredNamespaces.registerNamespace("micsr", 'Combat Simulator', true);
            }
            //gamemodes
            MICSR.gamemodes = MICSR.game.gamemodes.allObjects.filter((x: any) => x.id !== 'melvorD:Unset');

            // empty items
            MICSR.emptyItem = MICSR.game.emptyEquipmentItem;

            // skill IDs
            MICSR.skillIDs = {};
            MICSR.skillNames = [];
            MICSR.skillNamesLC = [];
            MICSR.game.skills.allObjects.forEach((x: any, i: number) => {
                MICSR.skillIDs[x.name] = i;
                MICSR.skillNames.push(x.name);
                MICSR.skillNamesLC.push(x.name.toLowerCase());
            });
            // pets array
            MICSR.pets = MICSR.actualGame.pets;
            // dg array
            MICSR.dungeons = MICSR.actualGame.dungeons;
            MICSR.dungeonIDs = MICSR.dungeons.allObjects.map((dungeon: any) => dungeon.id);
            MICSR.dungeonCount = MICSR.dungeonIDs.length;
            MICSR.isDungeonID = (id: string) => MICSR.dungeons.getObjectByID(id) !== undefined;
            // TODO filter special dungeons
            //  MICSR.dungeons = MICSR.dungeons.filter((dungeon) => dungeon.id !== Dungeons.Impending_Darkness);
            // TODO filter special monsters
            //  MICSR.dungeons[Dungeons.Into_the_Mist].monsters = [147, 148, 149];
            // monsters
            MICSR.bardID = 'melvorF:WanderingBard';
            MICSR.monsters = MICSR.actualGame.monsters;
            MICSR.monsterList = MICSR.actualGame.monsters.allObjects;
            MICSR.combatAreas = MICSR.actualGame.combatAreas;
            MICSR.slayerAreas = MICSR.actualGame.slayerAreas;
            MICSR.monsterIDs = [
                ...MICSR.combatAreas.allObjects
                    .map((area: any) => area.monsters.map((monster: any) => monster.id))
                    .reduce((a: any, b: any) => a.concat(b), []),
                MICSR.bardID,
                ...MICSR.slayerAreas.allObjects
                    .map((area: any) => area.monsters.map((monster: any) => monster.id))
                    .reduce((a: any, b: any) => a.concat(b), []),
            ]
            // potions
            MICSR.herblorePotions = MICSR.actualGame.herblore.actions;
            // items
            MICSR.items = MICSR.actualGame.items;
            // spells
            MICSR.standardSpells = MICSR.actualGame.standardSpells;
            MICSR.curseSpells = MICSR.actualGame.curseSpells;
            MICSR.auroraSpells = MICSR.actualGame.auroraSpells;
            MICSR.ancientSpells = MICSR.actualGame.ancientSpells;
            MICSR.archaicSpells = MICSR.actualGame.archaicSpells;
            // prayers
            MICSR.prayers = MICSR.actualGame.prayers;
            // attackStyles
            MICSR.attackStylesIdx = {};
            MICSR.actualGame.attackStyles.allObjects.forEach((x: any, i: number) => {
                let j = i;
                if (j > 3) {
                    j -= 3;
                }
                if (j > 2) {
                    j -= 2;
                }
                MICSR.attackStylesIdx[x] = j;
            });
        }

        // combine both setup functions
        MICSR.setup = (game: any) => {
            MICSR.setupData();
            MICSR.setupGame(game);
        }
        // run the MICSR setup function
        // @ts-expect-error TS(2304): Cannot find name 'game'.
        MICSR.setup(game);

        /**
         }
         * Formats a number with the specified number of sigfigs, Addings suffixes as required
         * @param {number} number Number
         * @param {number} digits Number of significant digits
         * @return {string}
         */
        MICSR.mcsFormatNum = (number: any, digits: any) => {
            let output = number.toPrecision(digits);
            let end = '';
            if (output.includes('e+')) {
                const power = parseInt(output.match(/\d*?$/));
                const powerCount = Math.floor(power / 3);
                output = `${output.match(/^[\d,\.]*/)}e+${power % 3}`;
                const formatEnd = ['', 'k', 'M', 'B', 'T'];
                if (powerCount < formatEnd.length) {
                    end = formatEnd[powerCount];
                } else {
                    end = `e${powerCount * 3}`;
                }
            }
            // @ts-expect-error TS(2554): Expected 0 arguments, but got 2.
            return `${+parseFloat(output).toFixed(6).toLocaleString(undefined, { minimumSignificantDigits: digits })}${end}`;
        }

        /**
         * Creates an id for an element from a name
         * @param {string} name The name describing the element
         * @returns An id starting with 'mcs-' and ending with the name in lowercase with spaces replaced by '-'
         */
        MICSR.toId = (name: any) => {
            return `mcs-${name.toLowerCase().replace(/ /g, '-')}`;
        }

        MICSR.checkImplemented = (stats: any, tag: any) => {
            if (!MICSR.isDev) {
                return;
            }
            Object.getOwnPropertyNames(stats).forEach(stat => {
                if (Array.isArray(stats[stat])) {
                    for (const substat of stats[stat]) {
                        if (!substat.implemented) {
                            MICSR.warn(tag + ' not yet implemented: ' + stat);
                        }
                    }
                } else if (!stats[stat].implemented) {
                    MICSR.warn(tag + ' stat not yet implemented: ' + stat);
                }
            })
        }

        MICSR.checkUnknown = (set: any, tag: any, elementType: any, knownSets: any, broken: any) => {
            if (!MICSR.isDev) {
                return;
            }
            // construct a list of stats that are not in any of the previous categories
            const unknownStatNames = {};
            set.forEach((element: any) => {
                Object.getOwnPropertyNames(element).forEach(stat => {
                    // check if any bugged stats are still present
                    if (broken[stat] !== undefined) {
                        MICSR.warn(tag + ' stat ' + stat + ' is bugged for ' + element.name + '!')
                        return;
                    }
                    // check if we already know this stat
                    for (const known of knownSets) {
                        if (known[stat] !== undefined) {
                            return;
                        }
                    }
                    // unknown stat found !
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    if (unknownStatNames[stat] === undefined) {
                        // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        unknownStatNames[stat] = [];
                    }
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    unknownStatNames[stat].push(element.name);
                })
            })

            Object.getOwnPropertyNames(unknownStatNames).forEach(stat => {
                // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                MICSR.warn('Unknown stat ' + stat + ' for ' + elementType + ': ', unknownStatNames[stat]);
            });
        }

        /**
         * Get the combined modifier value
         */
        MICSR.getModifierValue = (...args: any[]) => {
            return MICSR.showModifiersInstance.getModifierValue(...args);
        }

        /**
         * Apply modifier without rounding
         */
        MICSR.averageDoubleMultiplier = (modifier: any) => {
            return 1 + modifier / 100;
        }

        /**
         * Add agility course modifiers to `modifiers` object
         */
        MICSR.addAgilityModifiers = (course: any, courseMastery: any, pillar: any, modifiers: any) => {
            let fullCourse = true
            for (let i = 0; i < course.length; i++) {
                if (course[i] < 0) {
                    fullCourse = false;
                    break;
                }
                if (courseMastery[i]) {
                    // @ts-expect-error TS(2304): Cannot find name 'Agility'.
                    modifiers.addModifiers(Agility.obstacles[course[i]].modifiers, 0.5);
                } else {
                    // @ts-expect-error TS(2304): Cannot find name 'Agility'.
                    modifiers.addModifiers(Agility.obstacles[course[i]].modifiers);
                }
            }
            if (fullCourse && pillar > -1) {
                // @ts-expect-error TS(2304): Cannot find name 'Agility'.
                modifiers.addModifiers(Agility.passivePillars[pillar].modifiers);
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
    waitLoadOrder(reqs, setup, 'util');

})();