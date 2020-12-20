/*  Melvor Idle Combat Simulator

    Copyright (C) <2020>  <Coolrox95>

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

    /** @type {CombatSimulator} */
    let combatSimulator;

    onmessage = (event) => {
        switch (event.data.action) {
            case 'RECEIVE_GAMEDATA':
                combatSimulator = new CombatSimulator(event.data);
                break;
            case 'START_SIMULATION':
                const startTime = performance.now();
                combatSimulator.simulateMonster(event.data.monsterStats, event.data.playerStats, event.data.simOptions.trials, event.data.simOptions.maxActions).then((simResult) => {
                    const timeTaken = performance.now() - startTime;
                    postMessage({
                        action: 'FINISHED_SIM',
                        monsterID: event.data.monsterID,
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

    class CombatSimulator {
        constructor(data) {
            /**
             * [playerType][enemyType]
             * 0:Melee 1:Ranged 2:Magic
             */
            this.combatTriangle = {
                normal: {
                    damageModifier: [
                        [1, 1.1, 0.9],
                        [0.9, 1, 1.1],
                        [1.1, 0.9, 1],
                    ],
                    reductionModifier: [
                        [1, 1.25, 0.5],
                        [0.95, 1, 1.25],
                        [1.25, 0.85, 1],
                    ],
                },
                hardcore: {
                    damageModifier: [
                        [1, 1.1, 0.8],
                        [0.8, 1, 1.1],
                        [1.1, 0.8, 1],
                    ],
                    reductionModifier: [
                        [1, 1.25, 0.25],
                        [0.75, 1, 1.25],
                        [1.25, 0.75, 1],
                    ],
                },
            };
            this.cancelStatus = false;
            this.protectFromValue = data.protectFromValue;
            this.numberMultiplier = data.numberMultiplier;
            this.enemySpecialAttacks = data.enemySpecialAttacks;
            this.enemySpawnTimer = data.enemySpawnTimer;
            this.hitpointRegenInterval = data.hitpointRegenInterval;
            this.deadeyeAmulet = data.deadeyeAmulet;
            this.confettiCrossbow = data.confettiCrossbow;
            this.warlockAmulet = data.warlockAmulet;
            this.CURSEIDS = data.CURSEIDS;
        }

        /**
         * Simulation Method for a single monster
         * @param {EnemyStats} enemyStats
         * @param {PlayerStats} playerStats
         * @param {number} trials
         * @param {number} maxActions
         * @return {Promise<Object>}
         */
        async simulateMonster(enemyStats, playerStats, trials, maxActions) {
            let reductionModifier;
            let damageModifier;
            // Set Combat Triangle
            if (playerStats.hardcore) {
                reductionModifier = this.combatTriangle.hardcore.reductionModifier[playerStats.attackType][enemyStats.attackType];
                damageModifier = this.combatTriangle.hardcore.damageModifier[playerStats.attackType][enemyStats.attackType];
            } else {
                reductionModifier = this.combatTriangle.normal.reductionModifier[playerStats.attackType][enemyStats.attackType];
                damageModifier = this.combatTriangle.normal.damageModifier[playerStats.attackType][enemyStats.attackType];
            }
            // Multiply player special setDamage
            if (playerStats.specialData.setDamage) playerStats.specialData.setDamage *= this.numberMultiplier;
            // Multiply player max hit
            playerStats.maxHit = Math.floor(playerStats.maxHit * damageModifier);

            // Start Monte Carlo simulation
            let enemyKills = 0;

            // Stats from the simulation
            const stats = {
                totalTime: 0,
                playerAttackCalls: 0,
                enemyAttackCalls: 0,
                damageTaken: 0,
                damageHealed: 0,
                totalCombatXP: 0,
                totalHpXP: 0,
                totalPrayerXP: 0,
                gpGainedFromDamage: 0,
                playerActions: 0,
                enemyActions: 0,
                /** @type {PetRolls} */
                petRolls: {Prayer: {}, other: {}},
                runesUsed: 0,
            };

            // Adjust ancient magick forcehit
            if (playerStats.usingAncient && playerStats.specialData.forceHit) {
                playerStats.specialData.forceHit = playerStats.maxAttackRoll > 20000;
            }
            // var enemyReflectDamage = 0; //Damage caused by reflect
            // Start simulation for each trial
            this.cancelStatus = false;
            while (enemyKills < trials) {
                // Check Cancellation every 250th trial
                if (enemyKills % 250 === 0 && await this.isCanceled()) {
                    return {simSuccess: false};
                }
                // Reset Timers and statuses
                const player = this.resetPlayer(playerStats, enemyStats, reductionModifier, damageModifier);
                const enemy = this.resetEnemy(playerStats, enemyStats);
                if (playerStats.canCurse) {
                    this.setEnemyCurseValues(enemy, playerStats.curseID, playerStats.curseData.effectValue);
                }

                // Simulate combat until enemy is dead or max actions has been reached
                let enemyAlive = true;
                while (enemyAlive) {
                    // check player action limit
                    if (player.actionsTaken > maxActions) {
                        return {simSuccess: false};
                    }

                    // Determine the time step
                    let timeStep = Infinity;
                    // player time
                    if (player.isActing) timeStep = Math.min(timeStep, player.actionTimer);
                    if (player.isAttacking) timeStep = Math.min(timeStep, player.attackTimer);
                    if (player.isBurning) timeStep = Math.min(timeStep, player.burnTimer);
                    if (player.isRecoiling) timeStep = Math.min(timeStep, player.recoilTimer);
                    // enemy time
                    if (enemy.isActing) timeStep = Math.min(timeStep, enemy.actionTimer);
                    if (enemy.isAttacking) timeStep = Math.min(timeStep, enemy.attackTimer);
                    if (enemy.isBleeding) timeStep = Math.min(timeStep, enemy.bleedTimer);
                    // throw error on invalid time step
                    if (timeStep <= 0) {
                        throw Error('Error: Timestep ' + timeStep);
                    }

                    // Process time step
                    // player
                    if (player.isActing) player.actionTimer -= timeStep;
                    if (player.isAttacking) player.attackTimer -= timeStep;
                    if (player.isBurning) player.burnTimer -= timeStep;
                    if (player.isRecoiling) player.recoilTimer -= timeStep;
                    //enemy
                    if (enemy.isActing) enemy.actionTimer -= timeStep;
                    if (enemy.isAttacking) enemy.attackTimer -= timeStep;
                    if (enemy.isBleeding) enemy.bleedTimer -= timeStep;
                    // tracker
                    stats.totalTime += timeStep;

                    // Process player actions
                    if (player.isActing && player.actionTimer <= 0 && enemyAlive) {
                        enemyAlive = this.playerAction(stats, player, playerStats, enemy, enemyStats);
                    }
                    // Perform next attack of a multi attack special
                    if (player.isAttacking && player.attackTimer <= 0 && enemyAlive) {
                        enemyAlive = this.playerContinueAction(stats, player, playerStats, enemy, enemyStats);
                    }
                    // Process player status effect
                    this.playerBurn(stats, player, enemyAlive);
                    if (player.isRecoiling && player.recoilTimer <= 0 && enemyAlive) {
                        player.canRecoil = true;
                        player.isRecoiling = false;
                    }

                    // Process enemy actions
                    if (enemy.isActing && enemy.actionTimer <= 0 && enemyAlive) {
                        this.enemyAction(stats, player, playerStats, enemy, enemyStats);
                    }
                    // Perform next enemy attack of a multi attack special
                    if (enemy.isAttacking && enemy.attackTimer <= 0 && enemyAlive) {
                        this.enemyContinueAction(stats, player, playerStats, enemy, enemyStats)
                    }
                    // Process enemy status effect
                    enemyAlive = this.enemyBleed(enemy, enemyAlive);
                }
                if (isNaN(enemy.hitpoints)) {
                    return {simSuccess: false};
                } else {
                    enemyKills++;
                }
            }

            // Apply XP Bonuses
            // Ring bonus
            stats.totalCombatXP += stats.totalCombatXP * playerStats.xpBonus;
            stats.totalHpXP += stats.totalHpXP * playerStats.xpBonus;
            stats.totalPrayerXP += stats.totalPrayerXP * playerStats.xpBonus;
            // Global XP Bonus
            stats.totalCombatXP *= playerStats.globalXPMult;
            stats.totalHpXP *= playerStats.globalXPMult;
            stats.totalPrayerXP *= playerStats.globalXPMult;

            // Final Result from simulation
            return this.simulationResult(stats, playerStats, enemyStats, trials);
        };

        playerBurn(stats, player, enemyAlive) {
            if (player.isBurning && player.burnTimer <= 0 && enemyAlive) {
                // Do player burn damage
                if (player.burnCount >= player.burnMaxCount) {
                    player.isBurning = false;
                } else {
                    stats.damageTaken += player.burnDamage;
                    player.burnCount++;
                }
                player.burnTimer = player.burnInterval;
            }

        }

        enemyBleed(enemy, enemyAlive) {
            if (enemy.isBleeding && enemy.bleedTimer <= 0 && enemyAlive) {
                // Do enemy bleed damage
                if (enemy.bleedCount >= enemy.bleedMaxCount) {
                    enemy.isBleeding = false;
                } else if (enemy.hitpoints > 0) {
                    enemy.hitpoints -= enemy.bleedDamage;
                    enemy.bleedCount++;
                }
                enemy.bleedTimer = enemy.bleedInterval;
                if (enemy.hitpoints <= 0) {
                    enemyAlive = false;
                }
            }
            return enemyAlive;
        }

        enemyAction(stats, player, playerStats, enemy, enemyStats) {
            stats.enemyActions++;
            // Do enemy action
            if (enemy.isStunned) {
                enemy.stunTurns--;
                if (enemy.stunTurns <= 0) {
                    enemy.isStunned = false;
                }
                enemy.actionTimer = enemy.currentSpeed;
            } else {
                stats.enemyAttackCalls++;
                // Check if doing special
                let specialAttack = false;
                if (enemyStats.hasSpecialAttack) {
                    const chanceForSpec = Math.floor(Math.random() * 100);
                    let specCount = 0;
                    for (let i = 0; i < enemyStats.specialLength; i++) {
                        if (chanceForSpec <= enemyStats.specialAttackChances[i] + specCount) {
                            enemy.specialID = enemyStats.specialIDs[i];
                            enemy.doingSpecial = true;
                            specialAttack = true;
                            break;
                        }
                        specCount += enemyStats.specialAttackChances[i];
                    }
                }
                // Attack Parameters
                this.enemyDoAttack(stats, player, playerStats, enemy, enemyStats, specialAttack);
                this.enemyPostAttack(player, playerStats, enemy, enemyStats);
            }
        }

        enemyContinueAction(stats, player, playerStats, enemy, enemyStats) {
            // Do enemy multi attacks
            stats.enemyAttackCalls++;
            this.enemyDoAttack(stats, player, playerStats, enemy, enemyStats, true);
            this.enemyPostAttack(player, playerStats, enemy, enemyStats);
        }

        enemyDoAttack(stats, player, playerStats, enemy, enemyStats, isSpecial) {
            let forceHit = false;
            let currentSpecial;
            if (isSpecial) {
                // Do Enemy Special
                currentSpecial = this.enemySpecialAttacks[enemy.specialID];
                // Activate Buffs
                if (currentSpecial.activeBuffs && !enemy.isBuffed) {
                    enemy.isBuffed = true;
                    if (currentSpecial.activeBuffTurns !== null && currentSpecial.activeBuffTurns !== undefined) enemy.buffTurns = currentSpecial.activeBuffTurns;
                    else enemy.buffTurns = currentSpecial.attackCount;
                    // Set evasion buffs
                    enemy.meleeEvasionBuff = 1 + currentSpecial.increasedMeleeEvasion / 100;
                    enemy.rangedEvasionBuff = 1 + currentSpecial.increasedRangedEvasion / 100;
                    enemy.magicEvasionBuff = 1 + currentSpecial.increasedMagicEvasion / 100;
                    enemy.reflectMelee = currentSpecial.reflectMelee;
                    enemy.damageReduction = currentSpecial.increasedDamageReduction;
                    // Modify Player Accuracy according to buff
                    this.setEvasionDebuffs(enemyStats, enemy);
                    player.accuracy = this.calculateAccuracy(playerStats, enemy);
                }
                // Apply Player Slow
                if (currentSpecial.attackSpeedDebuff && !player.isSlowed) {
                    // Modify current player speed
                    player.isSlowed = true;
                    player.currentSpeed = Math.floor(playerStats.attackSpeed * (1 + currentSpecial.attackSpeedDebuff / 100)) - playerStats.attackSpeedDecrease;
                    player.slowTurns = currentSpecial.attackSpeedDebuffTurns;
                }
                forceHit = currentSpecial.forceHit;
            }
            // Do the first hit
            let attackHits;
            if (player.isStunned || forceHit) {
                attackHits = true;
            } else {
                // Roll for hit
                const hitChance = Math.floor(Math.random() * 100);
                attackHits = enemy.accuracy > hitChance;
            }

            if (attackHits) {
                //////////////////
                // apply damage //
                //////////////////
                let damageToPlayer;
                if (isSpecial && currentSpecial.setDamage !== null) {
                    damageToPlayer = currentSpecial.setDamage * this.numberMultiplier;
                } else {
                    damageToPlayer = Math.floor(Math.random() * enemy.maxHit) + 1;
                }
                if (isSpecial && player.isStunned) {
                    damageToPlayer *= currentSpecial.stunDamageMultiplier;
                }
                damageToPlayer -= Math.floor(player.damageReduction / 100 * damageToPlayer);
                stats.damageTaken += damageToPlayer;
                //////////////////
                // side effects //
                //////////////////
                // player recoil
                if (playerStats.activeItems.goldSapphireRing && player.canRecoil) {
                    const reflectDamage = Math.floor(Math.random() * 3 * this.numberMultiplier);
                    if (enemy.hitpoints > reflectDamage) {
                        enemy.hitpoints -= reflectDamage;
                        player.canRecoil = false;
                        player.isRecoiling = true;
                        player.recoilTimer = 2000;
                    }
                }
                // confusion curse
                if (enemy.isCursed && enemy.curse.type === 'Confusion') {
                    enemy.hitpoints -= Math.floor(enemy.hitpoints * enemy.curse.confusionMult);
                }
                // guardian amulet
                if (playerStats.activeItems.guardianAmulet && player.reductionBuff < 12) {
                    player.reductionBuff += 2;
                    player.damageReduction = Math.floor((playerStats.damageReduction + player.reductionBuff) * reductionModifier);
                }
                // Apply Stun
                if (isSpecial && currentSpecial.canStun && !player.isStunned) {
                    player.isStunned = true;
                    player.stunTurns = currentSpecial.stunTurns;
                    player.isAttacking = false;
                    player.isActing = true;
                    player.actionTimer = player.currentSpeed;
                }
                // Apply Burning
                if (isSpecial && currentSpecial.burnDebuff > 0 && !player.isBurning) {
                    player.isBurning = true;
                    player.burnCount = 0;
                    player.burnDamage = Math.floor((playerStats.levels.Hitpoints * this.numberMultiplier * (currentSpecial.burnDebuff / 100)) / player.burnMaxCount);
                    player.burnTimer = player.burnInterval;
                }
            }
            // set up timer for next attack
            if (isSpecial && enemy.isAttacking) {
                // handle multi-attack
                // Track attacks and determine next action
                enemy.attackCount++;
                if (enemy.attackCount >= enemy.countMax) {
                    enemy.isAttacking = false;
                    enemy.isActing = true;
                    enemy.actionTimer = enemy.currentSpeed;
                } else {
                    enemy.attackTimer = enemy.attackInterval;
                }
            } else if (isSpecial) {
                // Set up subsequent hits if required
                const isDOT = currentSpecial.setDOTDamage !== null;
                const maxCount = isDOT ? currentSpecial.DOTMaxProcs : currentSpecial.attackCount;
                if (maxCount > 1) {
                    enemy.attackCount = 1;
                    enemy.countMax = maxCount;
                    enemy.isActing = false;
                    enemy.isAttacking = true;
                    enemy.attackInterval = isDOT ? currentSpecial.DOTInterval : currentSpecial.attackInterval;
                    enemy.attackTimer = enemy.attackInterval;
                } else {
                    enemy.actionTimer = enemy.currentSpeed;
                }
            } else {
                enemy.actionTimer = enemy.currentSpeed;
            }
        }

        enemyPostAttack(player, playerStats, enemy, enemyStats) {
            // Buff tracking
            if (enemy.isBuffed) {
                enemy.buffTurns--;
                if (enemy.buffTurns <= 0) {
                    enemy.isBuffed = false;
                    // Undo buffs
                    this.setEvasionDebuffs(enemyStats, enemy);
                    player.accuracy= this.calculateAccuracy(playerStats, enemy);
                    enemy.reflectMelee = 0;
                    enemy.damageReduction = 0;
                }
            }
            // Slow Tracking
            if (enemy.isSlowed) {
                enemy.slowTurns--;
                if (enemy.slowTurns <= 0) {
                    enemy.isSlowed = false;
                    enemy.currentSpeed = enemyStats.attackSpeed;
                }
            }
            // Curse Tracking
            if (enemy.isCursed) {
                this.enemyCurseUpdate(player, enemy, enemyStats);
            }
        }

        enemyCurseUpdate(player, enemy, enemyStats) {
            // Apply decay
            if (enemy.curse.type === 'Decay') {
                enemy.hitpoints -= enemy.curse.decayDamage;
            }
            // reduce remaining curse turns
            enemy.curseTurns--;
            if (enemy.curseTurns > 0) {
                return;
            }
            // no curse turns remaining, revert stat changes
            enemy.isCursed = false;
            switch (enemy.curse.type) {
                case 'Blinding':
                    enemy.maxAttackRoll = enemyStats.maxAttackRoll;
                    if (!playerStats.isProtected) {
                        enemy.accuracy = this.calculateAccuracy(enemy, playerStats);
                    }
                    break;
                case 'Soul Split':
                case 'Decay':
                    this.setEvasionDebuffs(enemyStats, enemy);
                    player.accuracy = this.calculateAccuracy(playerStats, enemy);
                    break;
                case 'Weakening':
                    enemy.maxHit = enemyStats.maxHit;
                    break;
            }
        }

        // @return `enemyAlive` bool
        playerAction(stats, player, playerStats, enemy, enemyStats) {
            // player action: reduce stun count or attack
            stats.playerActions++;
            // reduce stun
            if (player.isStunned) {
                player.stunTurns--;
                if (player.stunTurns <= 0) {
                    player.isStunned = false;
                }
                player.actionTimer = player.currentSpeed;
                return true
            }
            // attack
            player.actionsTaken++;
            // track rune usage
            if (playerStats.usingMagic) {
                stats.runesUsed += playerStats.runeCosts.spell * (1 - playerStats.runePreservation) + playerStats.runeCosts.aurora;
            }
            // determine special or normal attack
            let specialAttack = playerStats.usingAncient;
            if (!specialAttack && playerStats.hasSpecialAttack) {
                // Roll for player special
                const specialRoll = Math.floor(Math.random() * 100);
                if (specialRoll <= playerStats.specialData.chance) {
                    specialAttack = true;
                }
            }
            // do normal or special attack
            const attackResult = this.playerDoAttack(stats, player, playerStats, enemy, enemyStats, specialAttack)
            this.processPlayerAttackResult(attackResult, stats, player, playerStats, enemy);
            this.playerUpdateActionTimer(player, specialAttack);
            // fight continues until player finishes attacking and until enemy runs out of health
            return player.isAttacking || enemy.hitpoints > 0;
        }

        playerContinueAction(stats, player, playerStats, enemy, enemyStats) {
            // perform continued attack
            const attackResult = this.playerDoAttack(stats, player, playerStats, enemy, enemyStats,true);
            this.processPlayerAttackResult(attackResult, stats, player, playerStats, enemy);
            this.playerUpdateActionTimer(player, false);
            // stop the fight if the enemy is dead
            return enemy.hitpoints > 0;
        }

        processPlayerAttackResult(attackResult, stats, player, playerStats, enemy) {
            if (!attackResult.attackHits) {
                // attack missed, nothing to do
                return;
            }
            // XP Tracking
            if (attackResult.damageToEnemy > 0) {
                let xpToAdd = attackResult.damageToEnemy / this.numberMultiplier * 4;
                if (xpToAdd < 4) {
                    xpToAdd = 4;
                }
                stats.totalHpXP += attackResult.damageToEnemy / this.numberMultiplier * 1.33;
                stats.totalPrayerXP += attackResult.damageToEnemy * playerStats.prayerXpPerDamage;
                stats.totalCombatXP += xpToAdd;
                if (playerStats.prayerXpPerDamage > 0) {
                    stats.petRolls.Prayer[player.currentSpeed] = (stats.petRolls.Prayer[player.currentSpeed] || 0) + 1;
                }
            }
            // Apply Stun
            if (attackResult.canStun && !enemy.isStunned) {
                enemy.isStunned = true;
                enemy.stunTurns = attackResult.stunTurns;
                enemy.isAttacking = false;
                enemy.actionTimer = enemy.currentSpeed;
                enemy.isActing = true;
            }
            // Player Slow Tracking
            if (player.isSlowed) {
                player.slowTurns--;
                if (player.slowTurns <= 0) {
                    player.isSlowed = false;
                    player.currentSpeed = playerStats.attackSpeed - playerStats.attackSpeedDecrease;
                }
            }
        }

        playerUsePreAttackSpecial(player, playerStats, enemy, enemyStats) {
            if (playerStats.specialData.decreasedRangedEvasion !== undefined) {
                enemy.rangedEvasionDebuff = 1 - playerStats.specialData.decreasedRangedEvasion / 100;
                this.setEvasionDebuffs(enemyStats, enemy);
                player.accuracy= this.calculateAccuracy(playerStats, enemy);
            }
        }

        playerUpdateActionTimer(player, specialAttack) {
            player.actionTimer = player.currentSpeed;
            // process ongoing multi-attack
            if (player.isAttacking) {
                // Track attacks and determine next action
                player.attackCount++;
                if (player.attackCount >= player.countMax) {
                    player.isAttacking = false;
                    player.isActing = true;
                } else {
                    player.attackTimer = playerStats.specialData.attackInterval;
                }
                return;
            }
            // trigger multi attack
            if (specialAttack && playerStats.specialData.attackCount > 1) {
                player.attackCount = 1;
                player.countMax = playerStats.specialData.attackCount;
                player.isActing = false;
                player.isAttacking = true;
                player.attackTimer = playerStats.specialData.attackInterval;
            }
        }

        playerUseCurse(stats, player, playerStats, enemy, enemyStats) {
            if (!playerStats.canCurse || enemy.isCursed) {
                return;
            }
            stats.runesUsed += playerStats.runeCosts.curse;
            const curseRoll = Math.random() * 100;
            if (playerStats.curseData.chance <= curseRoll) {
                return;
            }
            enemy.isCursed = true;
            enemy.curseTurns = 3;
            // Update the curses that change stats
            switch (enemy.curse.type) {
                case 'Blinding':
                    enemy.maxAttackRoll = Math.floor(enemy.maxAttackRoll * enemy.curse.accuracyDebuff);
                    if (!playerStats.isProtected) {
                        enemy.accuracy = this.calculateAccuracy(enemy, playerStats);
                    }
                    break;
                case 'Soul Split':
                case 'Decay':
                    this.setEvasionDebuffs(enemyStats, enemy);
                    player.accuracy = this.calculateAccuracy(playerStats, enemy);
                    break;
                case 'Weakening':
                    enemy.maxHit = Math.floor(enemy.maxHit * enemy.curse.maxHitDebuff);
                    break;
            }
        }

        playerDoAttack(stats, player, playerStats, enemy, enemyStats, isSpecial) {
            stats.playerAttackCalls++;
            // Apply pre-attack special effects
            this.playerUsePreAttackSpecial(player, playerStats, enemy, enemyStats);
            // Apply curse
            this.playerUseCurse(stats, player, playerStats, enemy, enemyStats);
            // default return values
            let canStun = false;
            let stunTurns = 0;
            let damageToEnemy = 0;
            // Check for guaranteed hit
            let attackHits = enemy.isStunned || (isSpecial && playerStats.specialData.forceHit);
            if (!attackHits) {
                // Roll for hit
                let hitChance = Math.floor(Math.random() * 100);
                if (playerStats.diamondLuck) {
                    const hitChance2 = Math.floor(Math.random() * 100);
                    if (hitChance > hitChance2) hitChance = hitChance2;
                }
                if (player.accuracy> hitChance) attackHits = true;
            }
            if (!attackHits) {
                // exit early
                return {
                    attackHits: false,
                };
            }
            stats.petRolls.other[player.currentSpeed] = (stats.petRolls.other[player.currentSpeed] || 0) + 1;
            damageToEnemy = this.playerCalculateDamage(player, playerStats, enemy, isSpecial);
            enemy.hitpoints -= Math.floor(damageToEnemy);
            if (isSpecial && playerStats.specialData.canBleed && !enemy.isBleeding) {
                let applyBleed = false;
                if (playerStats.specialData.bleedChance !== undefined) {
                    const bleedRoll = Math.random() * 100;
                    if (playerStats.specialData.bleedChance > bleedRoll) applyBleed = true;
                } else {
                    applyBleed = true;
                }
                if (applyBleed) {
                    // Start bleed effect
                    enemy.isBleeding = true;
                    enemy.bleedMaxCount = playerStats.specialData.bleedCount;
                    enemy.bleedInterval = playerStats.specialData.bleedInterval;
                    enemy.bleedCount = 0;
                    enemy.bleedDamage = Math.floor(damageToEnemy * playerStats.specialData.totalBleedHP / enemy.bleedMaxCount);
                    enemy.bleedTimer = enemy.bleedInterval;
                }
            }
            if (enemy.reflectMelee > 0) stats.damageTaken += enemy.reflectMelee * this.numberMultiplier;
            // Enemy Stun
            if (isSpecial) {
                if (playerStats.specialData.stunChance !== undefined) {
                    const stunRoll = Math.random() * 100;
                    if (playerStats.specialData.stunChance > stunRoll) canStun = true;
                } else {
                    canStun = playerStats.specialData.canStun;
                }
                if (canStun) {
                    stunTurns = playerStats.specialData.stunTurns;
                }
            }
            if (playerStats.activeItems.fighterAmulet && damageToEnemy >= playerStats.maxHit * 0.70) {
                canStun = true;
                stunTurns = 1;
            }
            // confetti crossbow
            if (playerStats.activeItems.confettiCrossbow) {
                // Add gp from this weapon
                let gpMultiplier = playerStats.startingGP / 25000000;
                if (gpMultiplier > this.confettiCrossbow.gpMultiplierCap) gpMultiplier = this.confettiCrossbow.gpMultiplierCap;
                else if (gpMultiplier < this.confettiCrossbow.gpMultiplierMin) gpMultiplier = this.confettiCrossbow.gpMultiplierMin;
                stats.gpGainedFromDamage += Math.floor(damageToEnemy * gpMultiplier);
            }
            if (playerStats.activeItems.warlockAmulet) stats.damageHealed += Math.floor(damageToEnemy * this.warlockAmulet.spellHeal);
            if (playerStats.lifesteal !== 0) stats.damageHealed += Math.floor(damageToEnemy * playerStats.lifesteal / 100);
            if (isSpecial) {
                if (playerStats.specialData.healsFor > 0) stats.damageHealed += Math.floor(damageToEnemy * playerStats.specialData.healsFor);
                // Enemy Slow
                if (playerStats.specialData.attackSpeedDebuff && !enemy.isSlowed) {
                    enemy.isSlowed = true;
                    enemy.slowTurns = playerStats.specialData.attackSpeedDebuffTurns;
                    enemy.currentSpeed = Math.floor(enemyStats.attackSpeed * (1 + playerStats.specialData.attackSpeedDebuff / 100));
                }
            }
            // return the result of the attack
            return {
                attackHits: true,
                canStun: canStun,
                stunTurns: stunTurns,
                damageToEnemy: damageToEnemy,
            };
        }

        playerCalculateDamage(player, playerStats, enemy, isSpecial) {
            let damageToEnemy;
            // Calculate attack Damage
            if (isSpecial && playerStats.specialData.setDamage) {
                damageToEnemy = playerStats.specialData.setDamage * playerStats.specialData.damageMultiplier * player.damageModifier;
            } else if (isSpecial && playerStats.specialData.maxHit) {
                damageToEnemy = playerStats.maxHit * playerStats.specialData.damageMultiplier;
            } else if (isSpecial && playerStats.specialData.stormsnap) {
                damageToEnemy = (6 + 6 * playerStats.levels.Magic) * player.damageModifier;
            } else {
                if (player.alwaysMaxHit) {
                    damageToEnemy = playerStats.maxHit;
                } else {
                    damageToEnemy = this.rollForDamage(playerStats);
                }
                if (isSpecial) {
                    damageToEnemy *= playerStats.specialData.damageMultiplier;
                }
            }
            if (enemy.isCursed && enemy.curse.type === 'Anguish') {
                damageToEnemy *= enemy.curse.damageMult;
            }
            // TODO: should stunDamageMultiplier apply to continued actions?
            //  If yes, then change this check to `if (isSpecial && enemy.isStunned)`
            // TODO: should stunDamageMultiplier apply to normal actions?
            //  If yes, then change this check to `if (!player.isAttacking && enemy.isStunned)`
            //  If both are yes, then change this check to `if (enemy.isStunned)`
            if (isSpecial && !player.isAttacking && enemy.isStunned) {
                damageToEnemy *= playerStats.specialData.stunDamageMultiplier;
            }
            if (playerStats.activeItems.deadeyeAmulet) {
                damageToEnemy = this.rollForDeadeyeAmulet(damageToEnemy);
            }
            if (enemy.damageReduction > 0) {
                damageToEnemy = Math.floor(damageToEnemy * (1 - (enemy.damageReduction / 100)));
            }
            if (enemy.hitpoints < damageToEnemy) {
                damageToEnemy = enemy.hitpoints;
            }
            return damageToEnemy;
        }

        resetPlayer(playerStats, enemyStats, reductionModifier, damageModifier) {
            const player = {
                hitpoints: playerStats.levels.Hitpoints * this.numberMultiplier,
                isStunned: false,
                stunTurns: 0,
                doingSpecial: false,
                actionTimer: 0,
                isActing: true,
                attackTimer: 0,
                isAttacking: false,
                burnTimer: 0,
                isBurning: false,
                burnMaxCount: 10,
                burnCount: 0,
                burnDamage: 0,
                burnInterval: 500,
                currentSpeed: 0,
                reductionBuff: 0,
                damageReduction: Math.floor(playerStats.damageReduction * reductionModifier),
                attackCount: 0,
                countMax: 0,
                isSlowed: false,
                slowTurns: 0,
                actionsTaken: 0,
                canRecoil: true,
                isRecoiling: false,
                recoilTimer: 0,
                accuracy: this.calculateAccuracy(playerStats, enemyStats),
                damageModifier: damageModifier,
                alwaysMaxHit: playerStats.minHit + 1 >= playerStats.maxHit, // Determine if player always hits for maxHit
            };
            player.hitpoints = 0;
            player.currentSpeed = playerStats.attackSpeed - playerStats.attackSpeedDecrease;
            player.actionTimer = player.currentSpeed;
            return player;
        }

        resetEnemy(playerStats, enemyStats) {
            const enemy = {
                hitpoints: enemyStats.hitpoints,
                isStunned: false,
                stunTurns: 0,
                doingSpecial: false,
                actionTimer: enemyStats.attackSpeed,
                isActing: true,
                attackTimer: 0,
                isAttacking: false,
                bleedTimer: 0,
                isBleeding: false,
                bleedMaxCount: 0,
                bleedInterval: 0,
                bleedCount: 0,
                bleedDamage: 0,
                isSlowed: false,
                slowTurns: 0,
                currentSpeed: enemyStats.attackSpeed,
                damageReduction: 0,
                reflectMelee: 0,
                specialID: null,
                attackCount: 0,
                countMax: 0,
                attackInterval: 0,
                isBuffed: false,
                buffTurns: 0,
                isCursed: false,
                curseTurns: 0,
                maxAttackRoll: enemyStats.maxAttackRoll,
                maxHit: enemyStats.maxHit,
                maxDefRoll: enemyStats.maxDefRoll,
                maxMagDefRoll: enemyStats.maxMagDefRoll,
                maxRngDefRoll: enemyStats.maxRngDefRoll,
                rangedEvasionDebuff: 1,
                meleeEvasionBuff: 1,
                magicEvasionBuff: 1,
                rangedEvasionBuff: 1,
                attackType: enemyStats.attackType,
                curse: {
                    type: '',
                    accuracyDebuff: 1,
                    maxHitDebuff: 1,
                    damageMult: 1,
                    magicEvasionDebuff: 1,
                    meleeEvasionDebuff: 1,
                    rangedEvasionDebuff: 1,
                    confusionMult: 0,
                    decayDamage: 0,
                },
            };
            // Set accuracy based on protection prayers or stats
            if (playerStats.isProtected) {
                enemy.accuracy= 100 - this.protectFromValue;
            } else {
                enemy.accuracy= this.calculateAccuracy(enemyStats, playerStats);
            }
            return enemy
        }

        simulationResult(stats, playerStats, enemyStats, trials) {
            /** @type {MonsterSimResult} */
            const simResult = {
                simSuccess: true,
                petRolls: {},
            };
            simResult.attacksMade = stats.playerAttackCalls / trials;
            simResult.avgHitDmg = enemyStats.hitpoints * trials / stats.playerAttackCalls;
            simResult.avgKillTime = this.enemySpawnTimer + stats.totalTime / trials;
            simResult.hpPerEnemy = (stats.damageTaken - stats.damageHealed) / trials - simResult.avgKillTime / this.hitpointRegenInterval * playerStats.avgHPRegen;
            if (simResult.hpPerEnemy < 0) {
                simResult.hpPerEnemy = 0;
            }
            simResult.hpPerSecond = simResult.hpPerEnemy / simResult.avgKillTime * 1000;
            simResult.dmgPerSecond = enemyStats.hitpoints / simResult.avgKillTime * 1000;
            simResult.xpPerEnemy = stats.totalCombatXP / trials;
            simResult.xpPerHit = stats.totalCombatXP / stats.playerAttackCalls;
            simResult.xpPerSecond = stats.totalCombatXP / trials / simResult.avgKillTime * 1000;
            simResult.hpxpPerEnemy = stats.totalHpXP / trials;
            simResult.hpxpPerSecond = stats.totalHpXP / trials / simResult.avgKillTime * 1000;
            simResult.killTimeS = simResult.avgKillTime / 1000;
            simResult.killsPerSecond = 1 / simResult.killTimeS;
            simResult.prayerXpPerEnemy = stats.totalPrayerXP / trials;
            simResult.prayerXpPerSecond = stats.totalPrayerXP / trials / simResult.avgKillTime * 1000;
            simResult.ppConsumedPerSecond = (stats.playerAttackCalls * playerStats.prayerPointsPerAttack + stats.enemyAttackCalls * playerStats.prayerPointsPerEnemy) / trials / simResult.killTimeS + playerStats.prayerPointsPerHeal / this.hitpointRegenInterval * 1000;
            simResult.gpFromDamage = stats.gpGainedFromDamage / trials;
            simResult.attacksTaken = stats.enemyAttackCalls / trials;
            simResult.attacksTakenPerSecond = stats.enemyAttackCalls / trials / simResult.killTimeS;
            simResult.attacksMadePerSecond = stats.playerAttackCalls / trials / simResult.killTimeS;
            simResult.runesUsedPerSecond = stats.runesUsed / trials / simResult.killTimeS;

            // Throw pet rolls in here to be further processed later
            Object.keys(stats.petRolls).forEach((petType) =>
                simResult.petRolls[petType] = Object.keys(stats.petRolls[petType]).map(attackSpeed => ({
                    speed: parseInt(attackSpeed),
                    rollsPerSecond: stats.petRolls[petType][attackSpeed] / trials / simResult.killTimeS,
                }))
            );
            // return successful results
            return simResult;
        }

        /**
         * Computes the accuracy of attacker vs target
         * @param {Object} attacker
         * @param {number} attacker.attackType Attack Type Melee:0, Ranged:1, Magic:2
         * @param {number} attacker.maxAttackRoll Accuracy Rating
         * @param {Object} target
         * @param {number} target.maxDefRoll Melee Evasion Rating
         * @param {number} target.maxRngDefRoll Ranged Evasion Rating
         * @param {number} target.maxMagDefRoll Magic Evasion Rating
         * @return {number}
         */
        calculateAccuracy(attacker, target) {
            let targetDefRoll;
            if (attacker.attackType === 0) {
                targetDefRoll = target.maxDefRoll;
            } else if (attacker.attackType === 1) {
                targetDefRoll = target.maxRngDefRoll;
            } else {
                targetDefRoll = target.maxMagDefRoll;
            }
            let accuracy;
            if (attacker.maxAttackRoll < targetDefRoll) {
                accuracy = (0.5 * attacker.maxAttackRoll / targetDefRoll) * 100;
            } else {
                accuracy = (1 - 0.5 * targetDefRoll / attacker.maxAttackRoll) * 100;
            }
            return accuracy;
        }

        /**
         * Modifies the stats of the enemy by the curse
         * @param {Object} enemy
         * @param {number} curseID
         * @param {number|number[]} effectValue
         */
        setEnemyCurseValues(enemy, curseID, effectValue) {
            switch (curseID) {
                case this.CURSEIDS.Blinding_I:
                case this.CURSEIDS.Blinding_II:
                case this.CURSEIDS.Blinding_III:
                    enemy.curse.accuracyDebuff = 1 - effectValue / 100;
                    enemy.curse.type = 'Blinding';
                    break;
                case this.CURSEIDS.Soul_Split_I:
                case this.CURSEIDS.Soul_Split_II:
                case this.CURSEIDS.Soul_Split_III:
                    enemy.curse.magicEvasionDebuff = 1 - effectValue / 100;
                    enemy.curse.type = 'Soul Split';
                    break;
                case this.CURSEIDS.Weakening_I:
                case this.CURSEIDS.Weakening_II:
                case this.CURSEIDS.Weakening_III:
                    enemy.curse.maxHitDebuff = 1 - effectValue / 100;
                    enemy.curse.type = 'Weakening';
                    break;
                case this.CURSEIDS.Anguish_I:
                case this.CURSEIDS.Anguish_II:
                case this.CURSEIDS.Anguish_III:
                    enemy.curse.damageMult = 1 + effectValue / 100;
                    enemy.curse.type = 'Anguish';
                    break;
                case this.CURSEIDS.Decay:
                    enemy.curse.meleeEvasionDebuff = 1 - effectValue[1] / 100;
                    enemy.curse.magicEvasionDebuff = 1 - effectValue[1] / 100;
                    enemy.curse.rangedEvasionDebuff = 1 - effectValue[1] / 100;
                    enemy.curse.decayDamage = Math.floor(enemy.hitpoints * effectValue[0] / 100);
                    enemy.curse.type = 'Decay';
                    break;
                case this.CURSEIDS.Confusion:
                    enemy.curse.confusionMult = effectValue / 100;
                    enemy.curse.type = 'Confusion';
                    break;
            }
        }

        /**
         * Rolls for damage for a regular attack
         * @param {playerStats} playerStats
         * @returns {number} damage
         */
        rollForDamage(playerStats) {
            return Math.ceil(Math.random() * (playerStats.maxHit - playerStats.minHit)) + playerStats.minHit;
        }

        /**
         * Rolls for a chance of Deadeye Amulet's crit damage
         * @param {damageToEnemy} damageToEnemy
         * @returns {damageToEnemy} `damageToEnemy`, possibly multiplied by Deadeye Amulet's crit bonus
         */
        rollForDeadeyeAmulet(damageToEnemy) {
            const chance = Math.random() * 100;
            if (chance < this.deadeyeAmulet.chanceToCrit) {
                damageToEnemy = Math.floor(damageToEnemy * this.deadeyeAmulet.critDamage);
            }
            return damageToEnemy;
        }

        /**
         * Modifies the stats of the enemy by the curse
         * @param {enemyStats} enemyStats
         * @param {Object} enemy
         */
        setEvasionDebuffs(enemyStats, enemy) {
            enemy.maxDefRoll = enemyStats.maxDefRoll;
            enemy.maxMagDefRoll = enemyStats.maxMagDefRoll;
            enemy.maxRngDefRoll = enemyStats.maxRngDefRoll;
            if (enemy.rangedEvasionDebuff !== 1) {
                enemy.maxRngDefRoll = Math.floor(enemy.maxRngDefRoll * enemy.rangedEvasionDebuff);
            }
            if (enemy.isBuffed) {
                enemy.maxDefRoll = Math.floor(enemy.maxDefRoll * enemy.meleeEvasionBuff);
                enemy.maxMagDefRoll = Math.floor(enemy.maxMagDefRoll * enemy.magicEvasionBuff);
                enemy.maxRngDefRoll = Math.floor(enemy.maxRngDefRoll * enemy.rangedEvasionBuff);
            }
            if (enemy.isCursed && (enemy.curse.type === 'Decay' || enemy.curse.type === 'Soul Split')) {
                enemy.maxDefRoll = Math.floor(enemy.maxDefRoll * enemy.curse.meleeEvasionDebuff);
                enemy.maxMagDefRoll = Math.floor(enemy.maxMagDefRoll * enemy.curse.magicEvasionDebuff);
                enemy.maxRngDefRoll = Math.floor(enemy.maxRngDefRoll * enemy.curse.rangedEvasionDebuff);
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