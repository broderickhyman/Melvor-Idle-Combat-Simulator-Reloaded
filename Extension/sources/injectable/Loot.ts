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
         * Loot class, used for all loot related work
         */
        MICSR.Loot = class {

            constructor(app, simulator) {
                this.app = app;
                this.player = this.app.player;
                this.modifiers = this.player.modifiers;
                this.simulator = simulator;
                this.monsterSimData = this.simulator.monsterSimData;
                this.dungeonSimData = this.simulator.dungeonSimData;
                this.slayerSimData = this.simulator.slayerSimData;
                this.slayerTaskMonsters = this.simulator.slayerTaskMonsters;

                this.lootBonus = MICSR.averageDoubleMultiplier(this.app.combatData.combatStats.lootBonusPercent);

                // Pet Settings
                this.petSkill = 'Attack';
                // Options for GP/s calculations
                this.sellBones = false; // True or false
                this.convertShards = false;

                // ids of god dungeons
                this.godDungeonIDs = [8, 9, 10, 11];

                // alchemy settings
                this.alchHighValueItems = false;
                this.alchemyCutoff = 10000;
                this.computingAlchCount = false;
            }

            /**
             * Computes the chance that a monster will drop loot when it dies
             * @param {number} monsterID
             * @return {number}
             */
            computeLootChance(monsterID) {
                return ((MONSTERS[monsterID].lootChance !== undefined) ? MONSTERS[monsterID].lootChance / 100 : 1);
            }

            /**
             * Computes the value of a monsters drop table respecting the loot sell settings
             * @param {number} monsterID
             * @return {number}
             */
            computeDropTableValue(monsterID) {
                // lootTable[x][0]: Item ID, [x][1]: Weight [x][2]: Max Qty
                if (MONSTERS[monsterID].lootTable) {
                    let gpWeight = 0;
                    let totWeight = 0;
                    MONSTERS[monsterID].lootTable.forEach((x) => {
                        const itemID = x[0];
                        let avgQty = (x[2] + 1) / 2;
                        if (items[itemID].canOpen) {
                            gpWeight += this.computeChestOpenValue(itemID) * avgQty;
                        } else {
                            const herbConvertChance = MICSR.getModifierValue(this.modifiers, 'ChanceToConvertSeedDrops');
                            if (herbConvertChance > 0 && (items[itemID].tier === 'Herb' && items[itemID].type === 'Seeds')) {
                                avgQty += 3;
                                gpWeight += (this.getItemValue(itemID) * (1 - herbConvertChance) + this.getItemValue(items[itemID].grownItemID) * herbConvertChance) * x[1] * avgQty;
                            } else {
                                gpWeight += this.getItemValue(itemID) * x[1] * avgQty;
                            }
                        }
                        totWeight += x[1];
                    });
                    return gpWeight / totWeight * this.lootBonus;
                }
            }

            /**
             * Computes the value of the contents of a chest respecting the loot sell settings
             * @param {number} chestID
             * @return {number}
             */
            computeChestOpenValue(chestID) {
                let gpWeight = 0;
                let totWeight = 0;
                let avgQty;
                for (let i = 0; i < items[chestID].dropTable.length; i++) {
                    if ((items[chestID].dropQty !== undefined) && (items[chestID].dropQty[i] !== undefined)) {
                        avgQty = (items[chestID].dropQty[i] + 1) / 2;
                    } else {
                        avgQty = 1;
                    }
                    gpWeight += avgQty * this.getItemValue(items[chestID].dropTable[i][0]) * items[chestID].dropTable[i][1];
                    totWeight += items[chestID].dropTable[i][1];
                }
                return gpWeight / totWeight;
            }

            /**
             * Computes the average amount of GP earned when killing a monster, respecting the loot sell settings
             * @param {number} monsterID
             * @return {number}
             */
            computeMonsterValue(monsterID) {
                // compute value from selling drops
                let monsterValue = 0;
                // loot and signet are affected by loot chance
                monsterValue += this.computeDropTableValue(monsterID);
                if (this.modifiers.allowSignetDrops) {
                    monsterValue += this.getItemValue(Items.Signet_Ring_Half_B) * getMonsterCombatLevel(monsterID) / 500000;
                } else {
                    monsterValue += this.getItemValue(Items.Gold_Topaz_Ring) * getMonsterCombatLevel(monsterID) / 500000;
                }
                monsterValue *= this.computeLootChance(monsterID);
                // bones drops are not affected by loot chance
                if (this.sellBones && !this.modifiers.autoBurying && MONSTERS[monsterID].bones) {
                    monsterValue += this.getItemValue(MONSTERS[monsterID].bones) * this.lootBonus * ((MONSTERS[monsterID].boneQty) ? MONSTERS[monsterID].boneQty : 1);
                }
                return monsterValue;
            }

            /**
             * Computes the average amount of GP earned when killing a monster in a dungeon, respecting the loot sell settings
             * @param {number} monsterID
             * @return {number}
             */
            computeDungeonMonsterValue(monsterID) {
                let gpPerKill = 0;
                if (this.godDungeonIDs.includes(this.app.viewedDungeonID)) {
                    const boneQty = MONSTERS[monsterID].boneQty ?? 1;
                    const shardID = MONSTERS[monsterID].bones;
                    if (this.convertShards) {
                        const chestID = items[shardID].trimmedItemID;
                        gpPerKill += boneQty * this.lootBonus / items[chestID].itemsRequired[0][1] * this.computeChestOpenValue(chestID);
                    } else {
                        gpPerKill += boneQty * this.lootBonus * this.getItemValue(shardID);
                    }
                }
                return gpPerKill;
            }

            /**
             * Computes the average amount of GP earned when completing a dungeon, respecting the loot sell settings
             * @param {number} dungeonID
             * @return {number}
             */
            computeDungeonValue(dungeonID) {
                let dungeonValue = 0;
                MICSR.dungeons[dungeonID].rewards.forEach((reward) => {
                    if (items[reward].canOpen) {
                        dungeonValue += this.computeChestOpenValue(reward) * this.lootBonus;
                    } else {
                        dungeonValue += this.getItemValue(reward) * this.lootBonus;
                    }
                });
                // Shards
                if (this.godDungeonIDs.includes(dungeonID)) {
                    let shardCount = 0;
                    const shardID = MONSTERS[MICSR.dungeons[dungeonID].monsters[0]].bones;
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID) => {
                        shardCount += MONSTERS[monsterID].boneQty ?? 1;
                    });
                    shardCount *= this.lootBonus;
                    if (this.convertShards) {
                        const chestID = items[shardID].trimmedItemID;
                        dungeonValue += shardCount / items[chestID].itemsRequired[0][1] * this.computeChestOpenValue(chestID);
                    } else {
                        dungeonValue += shardCount * this.getItemValue(shardID);
                    }
                }
                if (this.modifiers.allowSignetDrops) {
                    dungeonValue += this.getItemValue(Items.Signet_Ring_Half_B) * getMonsterCombatLevel(MICSR.dungeons[dungeonID].monsters[MICSR.dungeons[dungeonID].monsters.length - 1]) / 500000;
                }
                return dungeonValue;
            }

            getItemValue(id) {
                if (id === -1) {
                    // boneID from monster without bones, value and alch count are of course 0
                    return 0;
                }
                if (items[id] === undefined) {
                    MICSR.error(`Unexpected item id ${id} in Loot.getItemValue`);
                    return 0;
                }
                const value = items[id].sellsFor;
                const willAlch = this.alchHighValueItems && value >= this.alchemyCutoff
                if (this.computingAlchCount) {
                    return willAlch ? 1 : 0;
                }
                if (willAlch) {
                    return value * AltMagic.spells[10].productionRatio;
                }
                return value;
            }

            /**
             * Update all loot related statistics
             */
            update() {
                this.lootBonus = MICSR.averageDoubleMultiplier(this.app.combatData.combatStats.lootBonusPercent);
                this.updateGPData();
                this.updateSignetChance();
                this.updateDropChance();
                this.updatePetChance();
            }

            computeValueAlchs(f, ...args) {
                const value = this[f](...args);
                this.computingAlchCount = true;
                const alchTime = this[f](...args) * game.altMagic.baseInterval / 1000;
                this.computingAlchCount = false;
                return {value: value, alchTime: alchTime};
            }

            computeGP(data, f, ...args) {
                const monsterValue = this.computeValueAlchs(f, ...args);
                const value = monsterValue.value;
                data.alchTimeS = monsterValue.alchTime;
                const excludeAlchTime = data.baseGpPerSecond + value / data.killTimeS;
                data.gpPerSecond = (excludeAlchTime * data.killTimeS) / (data.killTimeS + data.alchTimeS);
            }

            /**
             * Computes the gp/kill and gp/s data for monsters and dungeons and sets those values.
             */
            updateGPData() {
                if (this.app.isViewingDungeon && this.app.viewedDungeonID < MICSR.dungeons.length) {
                    const dungeonID = this.app.viewedDungeonID
                    MICSR.dungeons[dungeonID].monsters.forEach((monsterID) => {
                        const simID = this.simulator.simID(dungeonID, monsterID);
                        if (!this.monsterSimData[simID]) {
                            return;
                        }
                        this.computeGP(
                            this.monsterSimData[simID],
                            'computeDungeonMonsterValue',
                            monsterID,
                        );
                    });
                } else {
                    const updateMonsterGP = (monsterID) => {
                        if (!this.monsterSimData[monsterID]) {
                            return;
                        }
                        if (this.monsterSimData[monsterID].simSuccess) {
                            this.computeGP(
                                this.monsterSimData[monsterID],
                                'computeMonsterValue',
                                monsterID,
                            );
                        }
                    };
                    // Regular monsters
                    this.app.monsterIDs.forEach(monsterID => updateMonsterGP(monsterID));
                    // Dungeons
                    for (let i = 0; i < MICSR.dungeons.length; i++) {
                        if (!this.dungeonSimData[i]) {
                            return;
                        }
                        if (this.dungeonSimData[i].simSuccess) {
                            this.computeGP(
                                this.dungeonSimData[i],
                                'computeDungeonValue',
                                i,
                            );
                        }
                    }
                    // slayer tasks
                    for (let taskID = 0; taskID < this.slayerTaskMonsters.length; taskID++) {
                        this.setMonsterListAverageDropRate('gpPerSecond', this.slayerSimData[taskID], this.slayerTaskMonsters[taskID]);
                    }
                }
            }

            /**
             * Updates the chance to receive your selected loot when killing monsters
             */
            updateDropChance() {
                const updateMonsterDropChance = (monsterID, data) => {
                    if (!data) {
                        return;
                    }
                    const dropCount = this.getAverageDropAmt(monsterID);
                    const itemDoubleChance = this.lootBonus;
                    data.dropChance = (dropCount * itemDoubleChance) / data.killTimeS;
                };

                // Set data for monsters in combat zones
                this.app.monsterIDs.forEach(monsterID => updateMonsterDropChance(monsterID, this.monsterSimData[monsterID]));
                // compute dungeon drop rates
                for (let dungeonID = 0; dungeonID < MICSR.dungeons.length; dungeonID++) {
                    const monsterList = MICSR.dungeons[dungeonID].monsters;
                    if (this.godDungeonIDs.includes(dungeonID)) {
                        MICSR.dungeons[dungeonID].monsters.forEach(monsterID => {
                            const simID = this.simulator.simID(monsterID, dungeonID);
                            updateMonsterDropChance(monsterID, this.monsterSimData[simID]);
                        });
                        this.setMonsterListAverageDropRate('dropChance', this.dungeonSimData[dungeonID], monsterList, dungeonID);
                    } else {
                        const monsterID = monsterList[monsterList.length - 1];
                        updateMonsterDropChance(monsterID, this.dungeonSimData[dungeonID]);
                    }
                }
                // compute auto slayer drop rates
                for (let taskID = 0; taskID < this.slayerTaskMonsters.length; taskID++) {
                    this.setMonsterListAverageDropRate('dropChance', this.slayerSimData[taskID], this.slayerTaskMonsters[taskID]);
                }
            }

            setMonsterListAverageDropRate(property, simData, monsterList, dungeonID) {
                if (!simData) {
                    return;
                }
                let drops = 0;
                let killTime = 0;
                for (const monsterID of monsterList) {
                    const simID = this.simulator.simID(monsterID, dungeonID);
                    if (!this.monsterSimData[simID]) {
                        return;
                    }
                    drops += this.monsterSimData[simID][property] * this.monsterSimData[simID].killTimeS;
                    killTime += this.monsterSimData[simID].killTimeS;
                }
                simData[property] = drops / killTime;
            }

            addChestLoot(chestID, chestChance, chestAmt) {
                const dropTable = items[chestID].dropTable;
                let chestItemChance = 0;
                let chestItemAmt = 0;
                if (dropTable) {
                    const chestSum = dropTable.reduce((acc, x) => acc + x[1], 0);
                    dropTable.forEach((x, i) => {
                        const chestItemId = x[0];
                        if (chestItemId === this.app.combatData.dropSelected) {
                            const weight = x[1];
                            chestItemChance += chestAmt * chestChance * weight / chestSum;
                            chestItemAmt += items[chestID].dropQty[i];
                        }
                    });
                }
                return {
                    chance: chestItemChance,
                    amt: chestItemAmt,
                };
            }

            getAverageRegularDropAmt(monsterId) {
                let totalChances = 0;
                let selectedChance = 0;
                let selectedAmt = 0;
                const monsterData = MONSTERS[monsterId];
                if (!monsterData.lootTable || monsterData.lootTable.length === 0) {
                    return 0;
                }
                monsterData.lootTable.forEach(drop => {
                    const itemId = drop[0];
                    const chance = drop[1];
                    totalChances += chance;
                    const amt = drop[2];
                    if (itemId === this.app.combatData.dropSelected) {
                        selectedChance += chance;
                        selectedAmt += amt;
                    }
                    const chest = this.addChestLoot(itemId, chance, amt);
                    selectedChance += chest.chance;
                    selectedAmt += chest.amt;
                })
                // compute drop rate based on monster loot chance, and drop table weights
                const lootChance = monsterData.lootChance ? monsterData.lootChance / 100 : 1;
                const dropRate = lootChance * selectedChance / totalChances;
                // On average, an item with up to `n` drops will drop `(n + 1) / 2` items
                const averageDropAmt = Math.max((selectedAmt + 1) / 2, 1);
                // multiply drop rate with drop amount
                return dropRate * averageDropAmt;
            }

            getAverageBoneDropAmt(monsterId) {
                const monsterData = MONSTERS[monsterId];
                const boneID = monsterData.bones;
                if (boneID === -1) {
                    return 0;
                }
                const amt = monsterData.boneQty ? monsterData.boneQty : 1;
                if (boneID === this.app.combatData.dropSelected) {
                    return amt;
                }
                const upgradeID = items[boneID].trimmedItemID;
                if (upgradeID === undefined || upgradeID === null) {
                    return 0;
                }
                const upgradeCost = items[items[boneID].trimmedItemID].itemsRequired.filter(x => x[0] === boneID)[0][1];
                const upgradeAmt = amt;
                if (upgradeID === this.app.combatData.dropSelected) {
                    return upgradeAmt / upgradeCost;
                }
                const chest = this.addChestLoot(upgradeID, 1, upgradeAmt);
                // compute drop rate based on chest table weights
                const dropRate = chest.chance / upgradeCost;
                // On average, an item with up to `n` drops will drop `(n + 1) / 2` items
                const averageDropAmt = Math.max((chest.amt + 1) / 2, 1);
                // multiply drop rate with drop amount
                return dropRate * averageDropAmt;
            }

            getAverageDropAmt(monsterId) {
                let averageDropAmt = 0;
                // regular drops
                averageDropAmt += this.getAverageRegularDropAmt(monsterId);
                // bone drops
                averageDropAmt += this.getAverageBoneDropAmt(monsterId);
                return averageDropAmt;
            }

            /**
             * Updates the chance to receive signet when killing monsters
             */
            updateSignetChance() {
                if (this.app.isViewingDungeon && this.app.viewedDungeonID < MICSR.dungeons.length) {
                    MICSR.dungeons[this.app.viewedDungeonID].monsters.forEach((monsterID) => {
                        if (!this.monsterSimData[monsterID]) {
                            return;
                        }
                        this.monsterSimData[monsterID].signetChance = 0;
                    });
                } else {
                    const updateMonsterSignetChance = (monsterID, data) => {
                        if (!data) {
                            return;
                        }
                        if (this.modifiers.allowSignetDrops && data.simSuccess) {
                            if (this.app.timeMultiplier === -1) {
                                data.signetChance = 100 * this.getSignetDropRate(monsterID);
                            } else {
                                data.signetChance = 100 * (1 - Math.pow(1 - this.getSignetDropRate(monsterID), this.app.timeMultiplier / data.killTimeS));
                            }
                        } else {
                            data.signetChance = 0;
                        }
                    };
                    // Set data for monsters in combat zones
                    this.app.monsterIDs.forEach(monsterID => updateMonsterSignetChance(monsterID, this.monsterSimData[monsterID]));
                    // Set data for dungeons
                    for (let i = 0; i < MICSR.dungeons.length; i++) {
                        const monsterID = MICSR.dungeons[i].monsters[MICSR.dungeons[i].monsters.length - 1];
                        updateMonsterSignetChance(monsterID, this.dungeonSimData[i]);
                    }
                    // Set data for auto slayer
                    for (let i = 0; i < this.slayerTaskMonsters.length; i++) {
                        // TODO: signet rolls for auto slayer
                        this.slayerSimData[i].signetChance = undefined;
                    }
                }
            }

            /**
             * Calculates the drop chance of a signet half from a monster
             * @param {number} monsterID The index of MONSTERS
             * @return {number}
             */
            getSignetDropRate(monsterID) {
                return getMonsterCombatLevel(monsterID) * this.computeLootChance(monsterID) / 500000;
            }

            /** Updates the chance to get a pet for the given skill*/
            updatePetChance() {
                const petSkills = ['Hitpoints', 'Prayer'];
                if (this.player.isSlayerTask) {
                    petSkills.push('Slayer');
                }
                const attackType = this.player.attackType;
                switch (attackType) {
                    case 'melee':
                        switch (this.player.attackStyles.melee) {
                            case 'Stab':
                                petSkills.push('Attack');
                                break;
                            case 'Slash':
                                petSkills.push('Strength');
                                break;
                            case 'Block':
                                petSkills.push('Defence');
                                break;
                        }
                        break;
                    case 'ranged':
                        petSkills.push('Ranged');
                        if (this.player.attackStyles.ranged === 'Longrange') {
                            petSkills.push('Defence');
                        }
                        break;
                    case 'magic':
                        petSkills.push('Magic');
                        if (this.player.attackStyles.magic === 'Defensive') {
                            petSkills.push('Defence');
                        }
                        break;
                }
                if (petSkills.includes(this.petSkill)) {
                    const timeMultiplier = (this.app.timeMultiplier === -1) ? simResult.killTimeS : this.app.timeMultiplier;
                    const petSkillLevel = this.player.skillLevel[Skills[this.petSkill]] + 1;
                    for (const simID in this.monsterSimData) {
                        const simResult = this.monsterSimData[simID];
                        simResult.petChance = 100 * (1 - this.chanceForNoPet(simResult, timeMultiplier, petSkillLevel));
                    }
                    MICSR.dungeons.forEach((_, dungeonID) => {
                        const dungeonResult = this.dungeonSimData[dungeonID];
                        let chanceToNotGet = 1;
                        MICSR.dungeons[dungeonID].monsters.forEach(monsterID => {
                            const simID = this.simulator.simID(monsterID, dungeonID);
                            const simResult = this.monsterSimData[simID];
                            const timeRatio = simResult.killTimeS / dungeonResult.killTimeS;
                            const chanceToNotGetFromMonster = this.chanceForNoPet(simResult, timeMultiplier * timeRatio, petSkillLevel);
                            simResult.petChance = 100 * (1 - chanceToNotGetFromMonster);
                            chanceToNotGet *= chanceToNotGetFromMonster;
                        });
                        dungeonResult.petChance = 100 * (1 - chanceToNotGet);
                    });
                    SlayerTask.data.forEach((_, taskID) => {
                        const taskResult = this.slayerSimData[taskID];
                        const sumTime = taskResult.killTimeS * this.simulator.slayerTaskMonsters[taskID].length;
                        let chanceToNotGet = 1;
                        this.simulator.slayerTaskMonsters[taskID].forEach(monsterID => {
                            const simResult = this.monsterSimData[monsterID];
                            const timeRatio = simResult.killTimeS / sumTime;
                            chanceToNotGet *= this.chanceForNoPet(simResult, timeMultiplier * timeRatio, petSkillLevel);
                        });
                        taskResult.petChance = 100 * (1 - chanceToNotGet);
                    });
                } else {
                    for (const simID in this.monsterSimData) {
                        const simResult = this.monsterSimData[simID];
                        simResult.petChance = 0;
                    }
                    this.dungeonSimData.forEach((simResult) => {
                        simResult.petChance = 0;
                    });
                    this.slayerSimData.forEach((simResult) => {
                        simResult.petChance = 0;
                    });
                }
            }

            chanceForNoPet(simResult, timeMultiplier, petSkillLevel) {
                let chanceToNotGet = 1;
                for (const interval in simResult.petRolls) {
                    const rollsPerSecond = simResult.petRolls[interval];
                    const rolls = timeMultiplier * rollsPerSecond;
                    const chancePerRoll = interval * petSkillLevel / 25e9;
                    chanceToNotGet *= Math.pow(1 - chancePerRoll, rolls);
                }
                return chanceToNotGet;
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
    waitLoadOrder(reqs, setup, 'Loot');

})();