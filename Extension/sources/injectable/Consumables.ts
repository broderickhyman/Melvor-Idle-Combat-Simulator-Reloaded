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
         * Class to handle consumables
         */
        MICSR.Consumables = class {
            constructor(app) {
                this.app = app;
                this.card = this.app.consumablesCard;
                this.player = this.app.player;
                this.simulator = this.app.simulator;
                // add export and import
                this.card.addButton('Export Rates', () => this.exportConsumableData());
                this.card.addTextInput('Import Rates:', '', event => this.importConsumableData(event));
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
                this.addConsumableInput(this.card, 'pp', 'Prayer Points', () => false);
                this.addConsumableInput(this.card, 'potion', 'Potion', () => false);
                this.addConsumableInput(this.card, 'food', 'Food', () => false);
                this.addConsumableInput(this.card, 'rune', 'Runes', () => false);
                this.addConsumableInput(this.card, 'combination', 'Combination Runes', () => false, 'rune');
                this.addConsumableInput(this.card, 'ammo', 'Ammo', () => false);
                this.addConsumableInput(this.card, 'summon', 'Familiar Tablets', () => false);
                // tab
                this.card.addTabMenu();
                // potions
                const potionCard = new MICSR.Card(this.card.container, '', '100px');
                Herblore.potions.filter(data => data.category === 0).map(data => data.potionIDs[0]).forEach(potionID =>
                    this.addConsumableInput(potionCard, potionID, items[potionID].name.replace('Potion I', 'Potion'), () => this.player.potionID !== -1 && potionID === Herblore.potions[this.player.potionID].potionIDs[0], 'potion')
                );
                // food
                const foodCard = new MICSR.Card(this.card.container, '', '100px');
                items.filter(item => this.app.filterIfHasKey('healsFor', item)).map(food => food.id).forEach(foodID =>
                    this.addItemInput(foodCard, foodID, () => foodID === this.player.food.currentSlot.item.id, 'food')
                );
                // runes
                const runesCard = new MICSR.Card(this.card.container, '', '100px');
                items.filter(x => x.type === 'Rune' && x.masteryID[0] === 15 && !x.providesRune).map(rune => rune.id).forEach(runeID =>
                    this.addItemInput(runesCard, runeID, () => this.runesInUse[runeID], 'rune')
                );
                // combination runes
                const combinationCard = new MICSR.Card(this.card.container, '', '100px');
                items.filter(x => x.type === 'Rune' && x.providesRune).forEach(combinationRune =>
                    this.addItemInput(combinationCard, combinationRune.id, () => this.runesInUse[combinationRune.id], 'combination')
                );
                // ammo
                const ammoCard = new MICSR.Card(this.card.container, '', '100px');
                [
                    {
                        id: 'arrow',
                        name: 'Arrows',
                        ammoType: 0,
                    },
                    {
                        id: 'bolt',
                        name: 'Bolts',
                        ammoType: 1,
                    },
                    {
                        id: 'knife',
                        name: 'Knives',
                        ammoType: 2,
                    },
                    {
                        id: 'javelin',
                        name: 'Javelins',
                        ammoType: 3,
                    },
                ].forEach(ammoInfo => {
                    this.addConsumableInput(ammoCard, ammoInfo.id, ammoInfo.name, () => false, 'ammo');
                    items.filter(x => x.ammoType === ammoInfo.ammoType).map(ammo => ammo.id).forEach(ammoID =>
                        this.addItemInput(ammoCard, ammoID, () => ammoID === this.player.equipmentID(equipmentSlotData.Quiver.id), ammoInfo.id)
                    );
                });
                // other quiver items
                this.addConsumableInput(ammoCard, 'otherQuiver', 'Other Quiver Items', () => false, 'ammo');
                items.filter(x => x.validSlots && x.validSlots.includes('Quiver') && x.ammoType === undefined).map(x => x.id).forEach(quiverID =>
                    this.addItemInput(ammoCard, quiverID, () => quiverID === this.player.equipmentID(equipmentSlotData.Quiver.id), 'otherQuiver')
                );
                // summons
                const summonCard = new MICSR.Card(this.card.container, '', '100px');
                items.filter(x => x.equipmentStats && x.equipmentStats.find(y => y.key === 'summoningMaxhit')).map(x => x.id).forEach(summonID =>
                    this.addItemInput(summonCard, summonID, () => this.player.equipmentIDs().includes(summonID), 'summon')
                );
                // add the tab cards
                [
                    {name: 'Potions', media: this.app.media.herblore, card: potionCard,},
                    {name: 'Food', media: this.app.media.cooking, card: foodCard,},
                    {name: 'Runes', media: this.app.media.airRune, card: runesCard,},
                    {name: 'Combination Runes', media: this.app.media.mistRune, card: combinationCard,},
                    {name: 'Ammunition', media: this.app.media.fletching, card: ammoCard,},
                    {name: 'Familiars', media: this.app.media.summoning, card: summonCard},
                ].forEach(cardInfo =>
                    this.card.addPremadeTab(
                        cardInfo.name,
                        cardInfo.media,
                        cardInfo.card,
                    )
                )
            }

            addItemInput(card, itemID, check, override) {
                const item = items[itemID];
                this.addConsumableInput(card, itemID, item.name, check, override);
            }

            addConsumableInput(card, id, name, check, override) {
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
                    event => this.setConsumableSecondsFromEvent(event, id),
                );
                if (override !== undefined) {
                    this.consumables[override].children.push(id);
                }
            }

            genericCheck(id) {
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
                    const element = document.getElementById(`MCS ${consumable.name} Input`).parentElement;
                    element.style.display = this.showAll || this.genericCheck(id) ? '' : 'none';
                }
            }

            setConsumableSecondsFromEvent(event, id) {
                let seconds = parseFloat(event.currentTarget.value);
                if (isNaN(seconds)) {
                    seconds = undefined;
                }
                this.setConsumableSeconds(id, seconds);
                this.saveRates();
            }

            setConsumableSeconds(id, seconds) {
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
                    settings[id] = this.consumables[id].seconds;
                }
                return JSON.stringify(settings, null, 1);
            }

            exportConsumableData() {
                this.app.popExport(this.getExportData());
            }

            importConsumableData(event) {
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

            importFromJSON(json) {
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
                    document.getElementById(`MCS ${this.consumables[id].name} Input`).value = settings[id] ?? '';
                }
            }

            getConsumableCostInSeconds(id) {
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
                for (const spellType in this.player.spellSelection) {
                    const spellSelection = this.player.spellSelection[spellType];
                    if (spellSelection === -1) {
                        continue;
                    }
                    const spell = this.app.combatData.spells[spellType][spellSelection];
                    const costs = this.player.getRuneCosts(spell).map(x => x.itemID);
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
                this.simulator.slayerSimData.forEach((sData, slayerTaskID) => {
                    this.updateSingleResult(sData);
                    // correct average kill time for auto slayer
                    sData.adjustedRates.killTimeS /= this.simulator.slayerTaskMonsters[slayerTaskID].length;
                });
            }

            updateSingleResult(data) {
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

            computeFactor(data) {
                // compute factor
                let factor = 1;
                // pp
                if (data.ppConsumedPerSecond > 0) {
                    factor += data.ppConsumedPerSecond * this.getConsumableCostInSeconds('pp');
                }
                // potion
                if (data.potionsUsedPerSecond > 0) {
                    if (Herblore.potions[this.player.potionID]) {
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
                    const ammoID = this.player.equipmentID(equipmentSlotData.Quiver.id);
                    factor += data.ammoUsedPerSecond * this.getConsumableCostInSeconds(ammoID);
                }
                // familiars
                if (data.tabletsUsedPerSecond > 0) {
                    [
                        MICSR.melvorCombatSim.player.equipmentID(EquipmentSlots.Summon1),
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
    waitLoadOrder(reqs, setup, 'Consumables');

})();