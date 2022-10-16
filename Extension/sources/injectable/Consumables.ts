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
         * Class to handle consumables
         */
        MICSR.Consumables = class {
            app: any;
            applyRates: any;
            card: any;
            consumables: any;
            player: any;
            runesInUse: any;
            showAll: any;
            simulator: any;

            constructor(app: any) {
                this.app = app;
                this.card = this.app.consumablesCard;
                this.player = this.app.player;
                this.simulator = this.app.simulator;
                // add export and import
                this.card.addButton('Export Rates', () => this.exportConsumableData());
                this.card.addTextInput('Import Rates:', '', (event: any) => this.importConsumableData(event));
                // toggles
                this.applyRates = false;
                this.card.addToggleRadio(
                    'Apply Rates',
                    `ApplyRates`,
                    this,
                    'applyRates',
                    this.applyRates,
                    25,
                    () => this.updateData(),
                );
                this.showAll = false;
                this.card.addToggleRadio(
                    'Show All Consumables',
                    `ShowAllConsumables`,
                    this,
                    'showAll',
                    this.showAll,
                    25,
                    () => this.updateView(),
                );
                // add consumables
                this.initConsumables();
            }

            initConsumables() {
                // consumables list
                this.consumables = {};
                // global costs
                this.card.addSectionTitle('Seconds per Consumable');
                // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
                this.addConsumableInput(this.card, 'pp', 'Prayer Points', () => false);
                // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
                this.addConsumableInput(this.card, 'potion', 'Potion', () => false);
                // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
                this.addConsumableInput(this.card, 'food', 'Food', () => false);
                // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
                this.addConsumableInput(this.card, 'rune', 'Runes', () => false);
                this.addConsumableInput(this.card, 'combination', 'Combination Runes', () => false, 'rune');
                // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
                this.addConsumableInput(this.card, 'ammo', 'Ammo', () => false);
                // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
                this.addConsumableInput(this.card, 'summon', 'Familiar Tablets', () => false);
                // tab
                this.card.addTabMenu();
                // potions
                const potionCard = new MICSR.Card(this.card.container, '', '100px');
                // food
                const foodCard = new MICSR.Card(this.card.container, '', '100px');
                // add the tab cards
                [
                    {name: 'Potions', media: this.app.media.herblore, card: potionCard,},
                    {name: 'Food', media: this.app.media.cooking, card: foodCard,},
                ].forEach(cardInfo =>
                    this.card.addPremadeTab(
                        cardInfo.name,
                        cardInfo.media,
                        cardInfo.card,
                    )
                )
            }

            addItemInput(card: any, itemID: any, check: any, override: any) {
                // @ts-expect-error TS(2304): Cannot find name 'items'.
                const item = items[itemID];
                this.addConsumableInput(card, itemID, item.name, check, override);
            }

            addConsumableInput(card: any, id: any, name: any, check: any, override: any) {
                this.consumables[id] = {
                    check: check,
                    name: name,
                    override: override,
                    seconds: undefined,
                    children: [],
                };
                card.addNumberInput(
                    name,
                    '',
                    0,
                    Infinity,
                    (event: any) => this.setConsumableSecondsFromEvent(event, id),
                );
                if (override !== undefined) {
                    this.consumables[override].children.push(id);
                }
            }

            genericCheck(id: any) {
                const consumable = this.consumables[id];
                for (const childID of consumable.children) {
                    if (this.genericCheck(childID)) {
                        return true;
                    }
                }
                return consumable.check();
            }

            updateView() {
                this.setRunesInUse();
                for (const id in this.consumables) {
                    const consumable = this.consumables[id];
                    // @ts-expect-error TS(2531): Object is possibly 'null'.
                    const element = document.getElementById(`MCS ${consumable.name} Input`).parentElement;
                    // @ts-expect-error TS(2531): Object is possibly 'null'.
                    element.style.display = this.showAll || this.genericCheck(id) ? '' : 'none';
                }
            }

            setConsumableSecondsFromEvent(event: any, id: any) {
                let seconds = parseFloat(event.currentTarget.value);
                if (isNaN(seconds)) {
                    // @ts-expect-error TS(2322): Type 'undefined' is not assignable to type 'number... Remove this comment to see the full error message
                    seconds = undefined;
                }
                this.setConsumableSeconds(id, seconds);
                this.saveRates();
            }

            setConsumableSeconds(id: any, seconds: any) {
                if (this.consumables[id] === undefined) {
                    MICSR.warn(`Unknown consumable id ${id} in Consumables.setConsumableSeconds`);
                    return;
                }
                if (this.consumables[id].seconds === seconds) {
                    // exit so we don't force an unnecessary update
                    return;
                }
                this.consumables[id].seconds = seconds;
                // update
                if (this.applyRates) {
                    this.updateData();
                }
            }

            updateData() {
                this.simulator.performPostSimAnalysis();
                this.app.updatePlotData();
                this.app.updateZoneInfoCard();
            }

            getExportData() {
                const settings = {};
                for (const id in this.consumables) {
                    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    settings[id] = this.consumables[id].seconds;
                }
                return JSON.stringify(settings, null, 1);
            }

            exportConsumableData() {
                this.app.popExport(this.getExportData());
            }

            importConsumableData(event: any) {
                this.importFromJSON(event.currentTarget.value);
                this.saveRates();
            }

            saveRates() {
                localStorage.setItem('MICSR-Consumables', this.getExportData());
            }

            loadRates() {
                const json = localStorage.getItem('MICSR-Consumables');
                if (json === null) {
                    return;
                }
                this.importFromJSON(json);
            }

            importFromJSON(json: any) {
                let settings;
                try {
                    settings = JSON.parse(json)
                } catch {
                    this.app.notify('Ignored invalid JSON consumable settings!', 'danger');
                    settings = {};
                }
                // wipes everything by setting unimported values to undefined
                for (const id in this.consumables) {
                    this.consumables[id].seconds = settings[id];
                    (document.getElementById(`MCS ${this.consumables[id].name} Input`) as any).value = settings[id] ?? '';
                }
            }

            // @ts-expect-error TS(7023): 'getConsumableCostInSeconds' implicitly has return... Remove this comment to see the full error message
            getConsumableCostInSeconds(id: any) {
                if (id === undefined || id === -1) {
                    return 0;
                }
                const consumable = this.consumables[id];
                if (consumable === undefined) {
                    MICSR.warn(`Unknown consumable id ${id} in Consumables.getConsumableCostInSeconds`);
                    return 0;
                }
                if (consumable.seconds !== undefined) {
                    return consumable.seconds;
                }
                if (consumable.override !== undefined) {
                    return this.getConsumableCostInSeconds(consumable.override);
                }
                return 0;
            }

            setRunesInUse() {
                this.runesInUse = {};
                for (const spellType in this.app.combatData.spells) {
                    const spell = this.player.spellSelection[spellType];
                    if (spell === undefined) {
                        continue;
                    }
                    const costs = this.player.getRuneCosts(spell).map((x: any) => x.itemID);
                    for (const runeID of costs) {
                        this.runesInUse[runeID] = true;
                    }
                }
            }

            update() {
                for (const simID in this.simulator.monsterSimData) {
                    this.updateSingleResult(this.simulator.monsterSimData[simID]);
                }
                for (const dData of this.simulator.dungeonSimData) {
                    this.updateSingleResult(dData);
                }
                this.simulator.slayerSimData.forEach((sData: any, slayerTaskID: any) => {
                    this.updateSingleResult(sData);
                    // correct average kill time for auto slayer
                    sData.adjustedRates.killTimeS /= this.simulator.slayerTaskMonsters[slayerTaskID].length;
                });
            }

            updateSingleResult(data: any) {
                const factor = this.computeFactor(data);
                data.adjustedRates = {};
                [
                    // xp rates
                    'xpPerSecond',
                    'hpXpPerSecond',
                    'slayerXpPerSecond',
                    'prayerXpPerSecond',
                    'summoningXpPerSecond',
                    // loot gains
                    'gpPerSecond',
                    'dropChance',
                    'slayerCoinsPerSecond',
                ].forEach(tag => data.adjustedRates[tag] = data[tag] / factor);
                // gp per second
                const gpFactor = (data.killTimeS + data.alchTimeS) / (data.killTimeS * factor + data.alchTimeS);
                data.adjustedRates.gpPerSecond = data.gpPerSecond * gpFactor;
                // kills per second
                data.adjustedRates.killTimeS = data.killTimeS * factor;
                data.adjustedRates.killsPerSecond = 1 / data.adjustedRates.killTimeS;
            }

            computeFactor(data: any) {
                // compute factor
                let factor = 1;
                // pp
                if (data.ppConsumedPerSecond > 0) {
                    factor += data.ppConsumedPerSecond * this.getConsumableCostInSeconds('pp');
                }
                // potion
                if (data.potionsUsedPerSecond > 0) {
                    // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                    if (Herblore.potions[this.player.potionID]) {
                        // @ts-expect-error TS(2304): Cannot find name 'Herblore'.
                        const potionID = Herblore.potions[this.player.potionID].potionIDs[0];
                        factor += data.potionsUsedPerSecond * this.getConsumableCostInSeconds(potionID);
                    } else {
                        MICSR.warn(`Unknown potion id ${this.player.potionID} in Consumables.computeFactor, with ${data.potionsUsedPerSecond} potions per second`);
                    }
                }
                // food
                if (data.atePerSecond > 0) {
                    const foodID = this.player.food.currentSlot.item.id;
                    factor += data.atePerSecond * this.getConsumableCostInSeconds(foodID);
                }
                // runes
                for (const runeID in data.usedRunesBreakdown) {
                    if (data.usedRunesBreakdown[runeID] > 0) {
                        factor += data.usedRunesBreakdown[runeID] * this.getConsumableCostInSeconds(runeID);
                    }
                }
                // ammo
                if (data.ammoUsedPerSecond > 0) {
                    // @ts-expect-error TS(2304): Cannot find name 'equipmentSlotData'.
                    const ammoID = this.player.equipmentID(equipmentSlotData.Quiver.id);
                    factor += data.ammoUsedPerSecond * this.getConsumableCostInSeconds(ammoID);
                }
                // familiars
                if (data.tabletsUsedPerSecond > 0) {
                    [
                        // @ts-expect-error TS(2304): Cannot find name 'EquipmentSlots'.
                        MICSR.melvorCombatSim.player.equipmentID(EquipmentSlots.Summon1),
                        // @ts-expect-error TS(2304): Cannot find name 'EquipmentSlots'.
                        MICSR.melvorCombatSim.player.equipmentID(EquipmentSlots.Summon2),
                    ].forEach(summonID => {
                        if (this.consumables[summonID]) {
                            factor += data.tabletsUsedPerSecond * this.getConsumableCostInSeconds(summonID);
                        }
                    });
                }
                return factor;
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
    waitLoadOrder(reqs, setup, 'Consumables');

})();