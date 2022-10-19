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

    const reqs: never[] = [];

    const setup = () => {

        const MICSR = (window as any).MICSR;

        /**
         * CloneData class, to clone some specific objects for transfer to the web workers
         */
        MICSR.CloneData = class {
            constructor() {
            };

            equipmentSlotData = () => {
                const clone: { [name: string]: string; } = {};
                // @ts-expect-error TS(2304): Cannot find name 'equipmentSlotData'.
                const base = equipmentSlotData;
                for (const key in base) {
                    const data = {...base[key]};
                    data.imageElements = [];
                    data.qtyElements = [];
                    data.tooltips = [];
                    data.quickEquipTooltip = [];
                    clone[key] = data;
                }
                return clone;
            }

            modifierData = () => {
                const clone: { [name: string]: string; } = {};
                // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                const base = modifierData;
                const knownKeys = [
                    'description',
                    'isNegative',
                    'isSkill',
                    'langDescription',
                    'tags',
                ];
                for (const key in base) {
                    const data = {...base[key]};
                    data.langDescription = '';
                    for (const propKey in data) {
                        const prop = data[propKey];
                        if (knownKeys.includes(propKey) || prop.minimum !== undefined) {
                            continue;
                        }
                        if (prop.name === 'modifyValue') {
                            data.modifyValueClone = prop.toString();
                        }
                        data[propKey] = prop.name;
                    }
                    clone[key] = data;
                }
                return clone;
            }

            restoreModifierData = () => {
                const clone: { [name: string]: string; } = {};
                // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                const base = modifierData;
                const knownKeys = [
                    'description',
                    'isNegative',
                    'isSkill',
                    'langDescription',
                    'tags',
                    'modifyValueClone',
                ];
                for (const key in base) {
                    const data = base[key];
                    for (const propKey in data) {
                        const prop = data[propKey];
                        if (knownKeys.includes(propKey) || prop.minimum !== undefined) {
                            continue;
                        }
                        let func = self[prop];
                        if (prop === 'modifyValue') {
                            eval(`func = ${data.modifyValueClone}`);
                        }
                        if (func === undefined) {
                            console.log(`Unknown function ${prop} in web worker`);
                        }
                        // @ts-expect-error TS(2304): Cannot find name 'modifierData'.
                        modifierData[key][propKey] = func;
                    }
                }
                return clone;
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
    waitLoadOrder(reqs, setup, 'CloneData');

})();