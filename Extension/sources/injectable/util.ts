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

        // global combat simulator object
        const MICSR = window.MICSR;

        // combat sim name
        MICSR.name = 'Melvor Idle Combat Simulator Reloaded';
        MICSR.shortName = 'Combat Simulator';

        // compatible game version
        MICSR.gameVersion = 'v1.0.5';

        // combat sim version
        MICSR.majorVersion = 1;
        MICSR.minorVersion = 6;
        MICSR.patchVersion = 10;
        MICSR.preReleaseVersion = undefined;
        MICSR.version = `v${MICSR.majorVersion}.${MICSR.minorVersion}.${MICSR.patchVersion}`;
        if (MICSR.preReleaseVersion !== undefined) {
            MICSR.version = `${MICSR.version}-${MICSR.preReleaseVersion}`;
        }

        MICSR.versionCheck = (exact, major, minor, patch, prerelease) => {
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

        // simulation settings
        MICSR.trials = 1e3;
        MICSR.maxTicks = 1e3;

        // empty items
        const makeEmptyItem = (img, slot) => {
            return {
                name: 'None',
                id: -1,
                media: img,
                validSlots: [slot]
            }
        };

        MICSR.emptyItems = {
            Helmet: makeEmptyItem('assets/media/bank/armour_helmet.png', 'Helmet'),
            Platebody: makeEmptyItem('assets/media/bank/armour_platebody.png', 'Platebody'),
            Platelegs: makeEmptyItem('assets/media/bank/armour_platelegs.png', 'Platelegs'),
            Boots: makeEmptyItem('assets/media/bank/armour_boots.png', 'Boots'),
            Weapon: {
                ...makeEmptyItem('assets/media/bank/weapon_sword.png', 'Weapon'),
                attackType: 'melee',
            },
            Shield: makeEmptyItem('assets/media/bank/armour_shield.png', 'Shield'),
            Amulet: makeEmptyItem('assets/media/bank/misc_amulet.png', 'Amulet'),
            Ring: makeEmptyItem('assets/media/bank/misc_ring.png', 'Ring'),
            Gloves: makeEmptyItem('assets/media/bank/armour_gloves.png', 'Gloves'),
            Quiver: makeEmptyItem('assets/media/bank/weapon_quiver.png', 'Quiver'),
            Cape: makeEmptyItem('assets/media/bank/armour_cape.png', 'Cape'),
            Passive: makeEmptyItem('assets/media/bank/passive_slot.png', 'Passive'),
            Summon1: makeEmptyItem('assets/media/bank/misc_summon.png', 'Summon1'),
            Summon2: makeEmptyItem('assets/media/bank/misc_summon.png', 'Summon2'),
            Food: makeEmptyItem('assets/media/skills/combat/food_empty.svg', 'Food'),
        };

        MICSR.getItem = (itemID, slotName) => {
            if (itemID === -1) {
                return MICSR.emptyItems[slotName];
            }
            return items[itemID];
        }

        MICSR.dungeons = [];
        DUNGEONS.forEach(dungeon => MICSR.dungeons.push({...dungeon}));
        MICSR.dungeons = MICSR.dungeons.filter(dungeon => dungeon.id !== Dungeons.Impending_Darkness);
        MICSR.dungeons[Dungeons.Into_the_Mist].monsters = [147, 148, 149];

        /**
         }
         * Formats a number with the specified number of sigfigs, Addings suffixes as required
         * @param {number} number Number
         * @param {number} digits Number of significant digits
         * @return {string}
         */
        MICSR.mcsFormatNum = (number, digits) => {
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
            return `${+parseFloat(output).toFixed(6).toLocaleString(undefined, {minimumSignificantDigits: digits})}${end}`;
        }

        /**
         * Creates an id for an element from a name
         * @param {string} name The name describing the element
         * @returns An id starting with 'mcs-' and ending with the name in lowercase with spaces replaced by '-'
         */
        MICSR.toId = (name) => {
            return `mcs-${name.toLowerCase().replace(/ /g, '-')}`;
        }

        MICSR.checkImplemented = (stats, tag) => {
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

        MICSR.checkUnknown = (set, tag, elementType, knownSets, broken) => {
            if (!MICSR.isDev) {
                return;
            }
            // construct a list of stats that are not in any of the previous categories
            const unknownStatNames = {};
            set.forEach(element => {
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
                    if (unknownStatNames[stat] === undefined) {
                        unknownStatNames[stat] = [];
                    }
                    unknownStatNames[stat].push(element.name);
                })
            })

            Object.getOwnPropertyNames(unknownStatNames).forEach(stat => {
                MICSR.warn('Unknown stat ' + stat + ' for ' + elementType + ': ', unknownStatNames[stat]);
            });
        }

        /**
         * Get the combined modifier value
         */
        MICSR.getModifierValue = (...args) => {
            return MICSR.showModifiersInstance.getModifierValue(...args);
        }

        /**
         * Apply modifier without rounding
         */
        MICSR.averageDoubleMultiplier = (modifier) => {
            return 1 + modifier / 100;
        }

        /**
         * Add agility course modifiers to `modifiers` object
         */
        MICSR.addAgilityModifiers = (course, courseMastery, pillar, modifiers) => {
            let fullCourse = true
            for (let i = 0; i < course.length; i++) {
                if (course[i] < 0) {
                    fullCourse = false;
                    break;
                }
                if (courseMastery[i]) {
                    modifiers.addModifiers(Agility.obstacles[course[i]].modifiers, 0.5);
                } else {
                    modifiers.addModifiers(Agility.obstacles[course[i]].modifiers);
                }
            }
            if (fullCourse && pillar > -1) {
                modifiers.addModifiers(Agility.passivePillars[pillar].modifiers);
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
    waitLoadOrder(reqs, setup, 'util');

})();