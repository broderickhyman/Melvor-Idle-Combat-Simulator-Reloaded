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
        'util',
        'AgilityCourse',
        'Card',
        'CombatData',
        'Consumables',
        'DataExport',
        'Import',
        'Plotter',
        'Loot',
        'Menu',
        'modifierNames',
        'SimEnemy',
        'SimManager',
        'SimPlayer',
        'Simulator',
        'TabCard',
    ];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * Container Class for the Combat Simulator.
         * A single instance of this is initiated on load.
         */
        MICSR.App = class {
            /**
             * Constructs an instance of mcsApp
             * @param {Object} urls URLs from content script
             * @param {string} urls.simulationWorker URL for simulator script
             * @param {string} urls.crossedOut URL for crossed out svg
             */
            constructor(urls) {
                // Combat Data Object
                this.manager = new MICSR.SimManager()
                this.manager.initialize();
                this.player = this.manager.player;
                this.combatData = new MICSR.CombatData(this.manager);
                // prepare tooltips
                this.tippyOptions = {allowHTML: true, animation: false, hideOnClick: false};
                this.tippyNoSingletonInstances = [];
                // Plot Type Options
                this.plotTypes = [];
                const addPlotOption = (option, isTime, value, info, scale = true) => {
                    this.plotTypes.push({
                        option: option,
                        isTime: isTime,
                        value: value,
                        info: info,
                        scale: scale && isTime,
                    });
                }
                // xp gains
                addPlotOption('XP per ', true, 'xpPerSecond', 'XP/');
                addPlotOption('HP XP per ', true, 'hpXpPerSecond', 'HP XP/');
                addPlotOption('Prayer XP per ', true, 'prayerXpPerSecond', 'Prayer XP/');
                addPlotOption('Slayer XP per ', true, 'slayerXpPerSecond', 'Slayer XP/');
                addPlotOption('Summoning XP per ', true, 'summoningXpPerSecond', 'Summoning XP/');
                // resource loss
                addPlotOption('Prayer Points per ', true, 'ppConsumedPerSecond', 'Prayer Points/');
                addPlotOption('Ammo per ', true, 'ammoUsedPerSecond', 'Ammo/');
                addPlotOption('Runes per ', true, 'runesUsedPerSecond', 'Runes/');
                addPlotOption('Combination Runes per ', true, 'combinationRunesUsedPerSecond', 'Comb. Runes/');
                addPlotOption('Potions per ', true, 'potionsUsedPerSecond', 'Potions/');
                addPlotOption('Tablets per type per ', true, 'tabletsUsedPerSecond', 'Tablets per type/');
                addPlotOption('Food per', true, 'atePerSecond', 'Food/');
                // survivability
                addPlotOption('Estimated Death Rate', false, 'deathRate', 'Est. Death Rate');
                addPlotOption('Highest Hit Taken', false, 'highestDamageTaken', 'Highest Hit Taken');
                addPlotOption('Lowest Hitpoints', false, 'lowestHitpoints', 'Lowest Hitpoints');
                // kill time
                addPlotOption('Average Kill Time (s)', false, 'killTimeS', 'Kill Time(s)');
                addPlotOption('Kills per ', true, 'killsPerSecond', 'Kills/');
                // loot gains
                addPlotOption('GP per ', true, 'gpPerSecond', 'GP/');
                addPlotOption('Drops per', true, 'dropChance', 'Drops/');
                addPlotOption('Percent Chance for Signet Part B per', true, 'signetChance', 'Signet (%)/', false);
                addPlotOption('Pet (%) per ', true, 'petChance', ' Pet (%)/');
                addPlotOption('Slayer Coins per ', true, 'slayerCoinsPerSecond', 'Slayer Coins/');
                // addPlotOption('Simulation Time', false, 'simulationTime', 'Sim Time');
                // Time unit options
                this.timeOptions = ['Kill', 'Second', 'Minute', 'Hour', 'Day'];
                this.timeShorthand = ['kill', 's', 'm', 'h', 'd'];
                this.timeMultipliers = [-1, 1, 60, 3600, 3600 * 24];
                this.initialTimeUnitIndex = 3;
                this.selectedTime = this.timeOptions[this.initialTimeUnitIndex];
                this.selectedTimeShorthand = this.timeShorthand[this.initialTimeUnitIndex];
                this.timeMultiplier = this.timeMultipliers[this.initialTimeUnitIndex];

                // Useful assets
                this.media = {
                    combat: 'assets/media/skills/combat/combat.png',
                    slayer: 'assets/media/skills/slayer/slayer.png',
                    prayer: 'assets/media/skills/prayer/prayer.svg',
                    spellbook: 'assets/media/skills/combat/spellbook.svg',
                    curse: 'assets/media/skills/combat/curses.svg',
                    aurora: 'assets/media/skills/combat/auroras.svg',
                    ancient: 'assets/media/skills/combat/ancient.svg',
                    emptyPotion: 'assets/media/skills/herblore/potion_empty.svg',
                    pet: 'assets/media/pets/hitpoints.png',
                    settings: 'assets/media/main/settings_header.svg',
                    gp: 'assets/media/main/coins.png',
                    attack: 'assets/media/skills/combat/attack.svg',
                    strength: 'assets/media/skills/combat/strength.svg',
                    ranged: 'assets/media/skills/ranged/ranged.svg',
                    magic: 'assets/media/skills/magic/magic.svg',
                    defence: 'assets/media/skills/defence/defence.svg',
                    hitpoints: 'assets/media/skills/hitpoints/hitpoints.svg',
                    emptyFood: 'assets/media/skills/combat/food_empty.svg',
                    agility: 'assets/media/skills/agility/agility.svg',
                    mastery: 'assets/media/main/mastery_header.png',
                    statistics: 'assets/media/main/statistics_header.svg',
                    loot: 'assets/media/bank/chapeau_noir.png',
                    summoning: 'assets/media/skills/summoning/summoning.svg',
                    synergy: 'assets/media/skills/summoning/synergy.svg',
                    synergyLock: 'assets/media/skills/summoning/synergy_locked.svg',
                    stamina: 'assets/media/main/stamina.png',
                    question: 'assets/media/main/question.svg',
                    airRune: getItemMedia(Items.Air_Rune),
                    mistRune: getItemMedia(Items.Mist_Rune),
                    bank: 'assets/media/main/bank_header.svg',
                    herblore: 'assets/media/skills/herblore/herblore.svg',
                    cooking: 'assets/media/skills/cooking/cooking.svg',
                    fletching: 'assets/media/skills/fletching/fletching.svg',
                    astrology: 'assets/media/skills/astrology/astrology.svg',
                    standardStar: 'assets/media/skills/astrology/star_standard.svg',
                    uniqueStar: 'assets/media/skills/astrology/star_unique.svg',
                };

                // monster IDs
                const bardID = 139;
                this.monsterIDs = [
                    ...combatAreas.map(area => area.monsters).reduce((a, b) => a.concat(b), []),
                    bardID,
                    ...slayerAreas.map(area => area.monsters).reduce((a, b) => a.concat(b), []),
                ]

                // combat pet IDs
                this.petIDs = [
                    2, // FM pet
                    12, 13, 14, 15, 16, 17, 18, 19, 20, // cb skill pets
                    22, 23, // slayer area pets
                    25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, // dungeon pets
                    45, // Mark
                    46, // Bone
                ];

                // Forced equipment sorting
                this.force = {
                    [Skills.Defence]: [Items.Slayer_Helmet_Basic, Items.Slayer_Platebody_Basic],
                    [Skills.Ranged]: [Items.Slayer_Cowl_Basic, Items.Slayer_Leather_Body_Basic],
                    [Skills.Magic]: [Items.Slayer_Wizard_Hat_Basic, Items.Slayer_Wizard_Robes_Basic, Items.Enchanted_Shield],
                };

                // Generate equipment subsets
                this.equipmentSubsets = [];
                /** @type {number[]} */
                for (const slot in equipmentSlotData) {
                    const slotId = equipmentSlotData[slot].id;
                    this.equipmentSubsets.push([MICSR.emptyItems[slot]]);
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].validSlots === undefined) {
                            continue;
                        }
                        if (items[i].validSlots.includes(slot)
                            || (items[i].validSlots.includes('Summon')
                                && slotId === equipmentSlotData.Summon2.id)) {
                            this.equipmentSubsets[slotId].push(items[i]);
                        }
                    }
                }
                this.equipmentSubsets[equipmentSlotData.Passive.id].push(...items.filter(x => x.isPassiveItem));
                // Add ammoType 2 and 3 to weapon subsets
                for (let i = 0; i < items.length; i++) {
                    if (items[i].validSlots && items[i].validSlots.includes('Quiver') && (items[i].ammoType === 2 || items[i].ammoType === 3)) {
                        this.equipmentSubsets[equipmentSlotData.Weapon.id].push(items[i]);
                    }
                }
                // Sort equipment subsets
                for (const slot in equipmentSlotData) {
                    const slotId = equipmentSlotData[slot].id;
                    this.equipmentSubsets[slotId].sort((a, b) => this.getItemLevelReq(a, Skills.Attack) - this.getItemLevelReq(b, Skills.Attack));
                    this.equipmentSubsets[slotId].sort((a, b) => this.getItemLevelReq(a, Skills.Defence) - this.getItemLevelReq(b, Skills.Defence));
                    this.equipmentSubsets[slotId].sort((a, b) => this.getItemLevelReq(a, Skills.Ranged) - this.getItemLevelReq(b, Skills.Ranged));
                    this.equipmentSubsets[slotId].sort((a, b) => this.getItemLevelReq(a, Skills.Magic) - this.getItemLevelReq(b, Skills.Magic));
                    if (slotId === equipmentSlotData.Quiver.id) {
                        this.equipmentSubsets[slotId].sort((a, b) => (a.ammoType || 0) - (b.ammoType || 0));
                    }
                }
                this.skillKeys = ['Attack', 'Strength', 'Defence', 'Hitpoints', 'Ranged', 'Magic', 'Prayer', 'Slayer'];
                // Simulation Object
                this.simulator = new MICSR.Simulator(this, urls.simulationWorker);
                // Import Object
                this.import = new MICSR.Import(this);
                // Data Export Object
                this.dataExport = new MICSR.DataExport(this);
                // Loot Object
                this.loot = new MICSR.Loot(this, this.simulator);

                // drop list filters
                this.dropListFilters = {
                    selectedMonster: false,
                    onlyUndiscovered: false,
                }

                // Create the top container for the sim
                this.topContent = document.createElement('div');
                this.topContent.className = 'mcsTabContent';
                // Create the bottom container for the sim
                this.botContent = document.createElement('div');
                this.botContent.className = 'mcsTabContent';
                this.botContent.style.flexWrap = 'nowrap';
                this.botContent.style.minHeight = '452px';

                // Plotter Object
                this.plotter = new MICSR.Plotter(this, urls.crossedOut);

                // Add Equipment and Food selection card
                this.createEquipmentSelectCard();
                // Add tab card
                this.mainTabCard = new MICSR.TabCard('mcsMainTab', true, this.topContent, '', '150px', true);

                // Add Cards to the tab card
                this.createLevelSelectCard();
                this.createSpellSelectCards();
                this.createPrayerSelectCard();
                this.createPotionSelectCard();
                this.createPetSelectCard();
                this.createAgilitySelectCard();
                this.createAstrologySelectCard();
                this.createLootOptionsCard();
                this.createSimulationAndExportCard();
                this.createCompareCard();
                this.createConsumablesCard();
                // Add Combat Stat Display Card
                this.createCombatStatDisplayCard();
                // Individual simulation info card
                this.createIndividualInfoCard();

                // Bar Chart Card
                this.monsterToggleState = true;
                this.dungeonToggleState = true;
                this.slayerToggleState = true;
                // Setup plotter bar clicking
                this.selectedBar = 0;
                this.barSelected = false;
                for (let i = 0; i < this.plotter.bars.length; i++) {
                    this.plotter.bars[i].parentElement.onclick = (() => this.barOnClick(i));
                }
                /** @type {number[]} */
                this.barMonsterIDs = [];
                /** @type {boolean[]} */
                this.barType = [];
                this.barTypes = {
                    monster: 0,
                    dungeon: 1,
                    task: 2,
                }

                combatAreas.forEach((area) => {
                    area.monsters.forEach((monster) => {
                        this.barMonsterIDs.push(monster);
                        this.barType.push(this.barTypes.monster);
                    });
                });
                this.barMonsterIDs.push(bardID);
                this.barType.push(this.barTypes.monster);
                slayerAreas.forEach((area) => {
                    area.monsters.forEach((monster) => {
                        this.barMonsterIDs.push(monster);
                        this.barType.push(this.barTypes.monster);
                    });
                });
                /** @type {number[]} */
                this.dungeonBarIDs = [];
                for (let i = 0; i < MICSR.dungeons.length; i++) {
                    this.dungeonBarIDs.push(this.barMonsterIDs.length);
                    this.barMonsterIDs.push(i);
                    this.barType.push(this.barTypes.dungeon);
                }
                for (let i = 0; i < SlayerTask.data.length; i++) {
                    this.dungeonBarIDs.push(this.barMonsterIDs.length);
                    this.barMonsterIDs.push(MICSR.dungeons.length + i);
                    this.barType.push(this.barTypes.task);
                }
                // Dungeon View Variables
                this.isViewingDungeon = false;
                this.viewedDungeonID = -1;

                // Now that everything is done we add the menu and modal to the document

                this.modalID = 'mcsModal';
                MICSR.addModal(`${MICSR.name} ${MICSR.version}`, this.modalID, [this.topContent, this.botContent]);
                this.menuItemId = 'mcsButton';
                MICSR.addMenuItem(MICSR.shortName, this.media.combat, this.menuItemId, this.modalID);

                // Finalize tooltips
                this.tippyInstances = tippy('#mcsModal [data-tippy-content]', this.tippyOptions);
                this.tippySingleton = tippy.createSingleton(this.tippyInstances, {delay: [0, 200], ...this.tippyOptions});
                for (const bar of this.plotter.bars) {
                    this.addNoSingletonTippy(bar, {triggerTarget: bar.parentElement});
                }

                // Setup the default state of the UI
                this.plotter.timeDropdown.selectedIndex = this.initialTimeUnitIndex;
                this.subInfoCard.container.style.display = 'none';
                this.plotter.petSkillDropdown.style.display = 'none';
                document.getElementById(`MCS  Pet (%)/${this.timeShorthand[this.initialTimeUnitIndex]} Label`).textContent = this.loot.petSkill + ' Pet (%)/' + this.selectedTimeShorthand;
                this.updateSpellOptions();
                this.updatePrayerOptions();
                this.updateCombatStats();
                this.updateHealing();
                this.updatePlotData();
                this.toggleAstrologySelectCard();
                // slayer sim is off by default, so toggle auto slayer off
                this.toggleSlayerSims(!this.slayerToggleState, false);
                // load from local storage
                this.consumables.loadRates();
            }

            printRelevantModifiers(modifiers, options = {}) {
                let header = '';
                if (options.header) {
                    const headerTag = options.headerTag ? options.headerTag : 'h5';
                    const headerClassNames = options.headerClassNames ? `class="${options.headerClassNames}"` : '';
                    header += `<${headerTag} ${headerClassNames}>${options.header}</${headerTag}>`;
                }
                let passives = '';
                MICSR.showModifiersInstance.printRelevantModifiers(modifiers, 'combat').forEach(toPrint => {
                    const tag = options.tag ? options.tag : 'h5';
                    let classNames = 'class="';
                    if (options.classNames) {
                        classNames += options.classNames;
                        classNames += ' ';
                    }
                    classNames += toPrint[1] + '"';
                    const style = options.style ? `style="${options.style}"` : '';
                    passives += `<${tag} ${classNames} ${style}>${toPrint[0]}</${tag}>`;
                });
                return {header: header, passives: passives};
            }

            showRelevantModifiers(modifiers, header) {
                const options = {
                    header: header,
                    headerTag: 'h5',
                    headerClassNames: 'font-w600 font-size-sm mb-1 text-combat-smoke',
                    tag: 'h5',
                    classNames: 'font-w400 font-size-sm mb-1',
                    style: 'text-align: left;',
                };
                const printedModifiers = this.printRelevantModifiers(modifiers, options)
                Swal.fire({
                    html: printedModifiers.headers + printedModifiers.passives,
                });
            }

            setSummoningSynergyText() {
                // set image
                const img = document.getElementById('MCS Summoning Synergy Button Image');
                if (!img) {
                    return;
                }
                if (this.player.summoningSynergy) {
                    img.src = this.media.synergy;
                } else {
                    img.src = this.media.synergyLock;
                }
                // set text
                const text = document.getElementById('MCS Summoning Synergy Info');
                if (!text) {
                    return;
                }
                if (!this.player.summoningSynergy) {
                    text.textContent = 'Synergy locked';
                    return;
                }
                const synergy = this.player.activeSummoningSynergy;
                if (synergy) {
                    text.textContent = synergy.description;
                    return;
                }
                text.textContent = 'No synergy possible.';
            }

            createEquipmentSelectCard() {
                this.equipmentSelectCard = new MICSR.Card(this.topContent, '', '150px', true);
                const equipmentRows = [
                    [equipmentSlotData.Passive.id, equipmentSlotData.Helmet.id],
                    [equipmentSlotData.Cape.id, equipmentSlotData.Amulet.id, equipmentSlotData.Quiver.id],
                    [equipmentSlotData.Weapon.id, equipmentSlotData.Platebody.id, equipmentSlotData.Shield.id],
                    [equipmentSlotData.Platelegs.id],
                    [equipmentSlotData.Gloves.id, equipmentSlotData.Boots.id, equipmentSlotData.Ring.id],
                    [equipmentSlotData.Summon1.id, equipmentSlotData.Summon2.id]
                ];
                equipmentRows.forEach((row) => {
                    const rowSources = [];
                    const rowIDs = [];
                    const rowPopups = [];
                    const tooltips = [];
                    row.forEach((equipmentSlot) => {
                        rowSources.push(MICSR.emptyItems[EquipmentSlots[equipmentSlot]].media);
                        rowIDs.push(`MCS ${EquipmentSlots[equipmentSlot]} Image`);
                        rowPopups.push(this.createEquipmentPopup(equipmentSlot));
                        tooltips.push(EquipmentSlots[equipmentSlot]);
                    });
                    this.equipmentSelectCard.addMultiPopupMenu(rowSources, rowIDs, rowPopups, tooltips);
                });
                this.equipmentSelectCard.addImageToggleWithInfo(
                    this.media.synergyLock,
                    'Summoning Synergy',
                    () => {
                        this.player.summoningSynergy = !this.player.summoningSynergy;
                        this.setSummoningSynergyText();
                        this.updateCombatStats();
                    },
                    'Synergy locked.',
                );

                // Style dropdown (Specially Coded)
                const combatStyleCCContainer = this.equipmentSelectCard.createCCContainer();
                const combatStyleLabel = this.equipmentSelectCard.createLabel('Combat Style', '');
                combatStyleLabel.classList.add('mb-1');
                const meleeStyleDropdown = this.equipmentSelectCard.createDropdown(['Stab', 'Slash', 'Block'], [0, 1, 2], 'MCS melee Style Dropdown', (event) => this.styleDropdownOnChange(event, 'melee'));
                const rangedStyleDropdown = this.equipmentSelectCard.createDropdown(['Accurate', 'Rapid', 'Longrange'], [0, 1, 2], 'MCS ranged Style Dropdown', (event) => this.styleDropdownOnChange(event, 'ranged'));
                const magicStyleDropdown = this.equipmentSelectCard.createDropdown(['Magic', 'Defensive'], [0, 1], 'MCS magic Style Dropdown', (event) => this.styleDropdownOnChange(event, 'magic'));
                rangedStyleDropdown.style.display = 'none';
                magicStyleDropdown.style.display = 'none';
                combatStyleCCContainer.appendChild(combatStyleLabel);
                combatStyleCCContainer.appendChild(meleeStyleDropdown);
                combatStyleCCContainer.appendChild(rangedStyleDropdown);
                combatStyleCCContainer.appendChild(magicStyleDropdown);
                this.equipmentSelectCard.container.appendChild(combatStyleCCContainer);
                // food container
                this.createFoodContainer();
                // cooking mastery
                this.equipmentSelectCard.addToggleRadio(
                    '95% Cooking Pool',
                    'cookingPool',
                    this.player,
                    'cookingPool',
                    this.player.cookingPool,
                    25,
                    () => this.updateHealing(),
                );
                this.equipmentSelectCard.addToggleRadio(
                    '99 Cooking Mastery',
                    'cookingMastery',
                    this.player,
                    'cookingMastery',
                    this.player.cookingMastery,
                    25,
                    () => this.updateHealing(),
                );
                this.equipmentSelectCard.addToggleRadio(
                    'Manual Eating',
                    'isManualEating',
                    this.player,
                    'isManualEating',
                    this.player.isManualEating
                );
                // Slayer task
                this.equipmentSelectCard.addRadio(
                    'Slayer Task',
                    25,
                    'slayerTask',
                    ['Yes', 'No'],
                    [
                        (e) => this.slayerTaskRadioOnChange(e, true),
                        (e) => this.slayerTaskRadioOnChange(e, false),
                    ],
                    1,
                );
                // game mode
                const gameModeNames = [];
                const gameModeValues = [];
                for (const i in GAMEMODES) {
                    gameModeNames.push(GAMEMODES[i].name);
                    gameModeValues.push(i);
                }
                const gameModeDropdown = this.equipmentSelectCard.createDropdown(gameModeNames, gameModeValues, 'MCS Game Mode Dropdown', (event) => {
                    this.player.currentGamemode = parseInt(event.currentTarget.selectedOptions[0].value);
                });
                const gameModeContainer = this.equipmentSelectCard.createCCContainer();
                gameModeContainer.appendChild(gameModeDropdown);
                this.equipmentSelectCard.container.appendChild(gameModeContainer);
                // import equipment and settings
                const importSetCCContainer = this.equipmentSelectCard.createCCContainer();
                importSetCCContainer.appendChild(this.equipmentSelectCard.createLabel('Import Set', ''));
                // only create buttons for purchased equipment sets
                let importButtonText = [];
                let importButtonFunc = [];
                for (let i = 0; i < player.equipmentSets.length; i++) {
                    importButtonText.push(`${i + 1}`);
                    importButtonFunc.push(() => this.import.importButtonOnClick(i));
                }
                this.equipmentSelectCard.addMultiButton(importButtonText, importButtonFunc, importSetCCContainer);
                this.equipmentSelectCard.container.appendChild(importSetCCContainer);
                // add button to show all modifiers
                const modifierCCContainer = this.equipmentSelectCard.createCCContainer();
                modifierCCContainer.appendChild(this.equipmentSelectCard.addButton('Show Modifiers', () => this.showRelevantModifiers(this.player.modifiers, 'Active modifiers')));
                this.equipmentSelectCard.container.appendChild(modifierCCContainer);
            }

            createFoodContainer() {
                this.foodCCContainer = this.equipmentSelectCard.createCCContainer();
                // food card
                const containerDiv = document.createElement('div');
                containerDiv.style.position = 'relative';
                containerDiv.style.cursor = 'pointer';
                const newImage = document.createElement('img');
                newImage.id = 'MCS Food Image';
                newImage.style.border = '1px solid red';
                newImage.src = this.media.emptyFood;
                newImage.className = 'combat-food';
                newImage.dataset.tippyContent = 'No Food';
                newImage.dataset.tippyHideonclick = 'true';
                containerDiv.appendChild(newImage);
                const foodPopup = (() => {
                    const foodSelectPopup = document.createElement('div');
                    foodSelectPopup.className = 'mcsPopup';
                    const equipmentSelectCard = new MICSR.Card(foodSelectPopup, '', '600px');
                    equipmentSelectCard.addSectionTitle('Food');
                    this.foodItems = [MICSR.emptyItems.Food, ...items].filter((item) => this.filterIfHasKey('healsFor', item));
                    this.foodItems.sort((a, b) => b.healsFor - a.healsFor);
                    const buttonMedia = this.foodItems.map((item) => this.getItemMedia(item));
                    const buttonIds = this.foodItems.map((item) => this.getItemName(item.id));
                    const buttonCallbacks = this.foodItems.map((item) => () => this.equipFood(item.id));
                    const tooltips = this.foodItems.map((item) => this.getFoodTooltip(item));
                    equipmentSelectCard.addImageButtons(buttonMedia, buttonIds, 'Small', buttonCallbacks, tooltips, '100%');
                    return foodSelectPopup;
                })();
                containerDiv.appendChild(foodPopup);
                this.foodCCContainer.appendChild(containerDiv);
                foodPopup.style.display = 'none';
                this.equipmentSelectCard.registerPopupMenu(containerDiv, foodPopup);
                // heal amt
                let label = document.createElement('span');
                label.id = 'MICSR-heal-amount-Label';
                label.className = 'text-bank-desc';
                label.textContent = '+0';
                const image = document.createElement('img');
                image.className = 'skill-icon-xs mr-1';
                image.src = this.media.hitpoints;
                const wrapper = document.createElement('h5');
                wrapper.className = 'font-w400 font-size-sm text-left text-combat-smoke m-1 mb-2';
                wrapper.appendChild(image);
                wrapper.appendChild(label);
                this.foodCCContainer.appendChild(wrapper);
                // auto eat dropdown
                let autoEatTierNames = ['No Auto Eat'];
                let autoEatTierValues = [-1];
                for (let i = 1; i < 4; i++) {
                    autoEatTierNames.push(SHOP.General[i].name.replace(' - Tier', ''));
                    autoEatTierValues.push(i - 1);
                }
                const autoEatTierDropdown = this.equipmentSelectCard.createDropdown(autoEatTierNames, autoEatTierValues, 'MCS Auto Eat Tier Dropdown', (event) => {
                    this.player.autoEatTier = parseInt(event.currentTarget.selectedOptions[0].value);
                    this.updateCombatStats();
                });
                this.foodCCContainer.appendChild(autoEatTierDropdown);
                // append to equipmentSelectCard
                this.equipmentSelectCard.container.appendChild(this.foodCCContainer);
            }

            equipFood(itemID) {
                this.player.equipFood(itemID);
                const img = document.getElementById('MCS Food Image');
                if (itemID === -1) {
                    img.src = 'assets/media/skills/combat/food_empty.svg';
                    img.style.border = '1px solid red';
                } else {
                    img.src = getItemMedia(itemID);
                    img.style.border = '';
                }
                img._tippy.setContent(this.getFoodTooltip(items[itemID]));
                this.updateHealing();
            }

            getFoodTooltip(item) {
                if (!item || item.id === -1) {
                    return 'No Food';
                }
                let tooltip = `<div class="text-center">${item.name}<br><small>`;
                if (item.description) {
                    tooltip += `<span class='text-info'>${item.description.replace(/<br>\(/, ' (')}</span><br>`;
                }
                if (item.healsFor) {
                    const amt = Math.round(item.healsFor * numberMultiplier);
                    tooltip += `<h5 class="font-w400 font-size-sm text-left text-combat-smoke m-1 mb-2">Base healing: <img class="skill-icon-xs mr-1" src="${this.media.hitpoints}"><span class="text-bank-desc">+${amt} HP</span></h5>`;
                }
                tooltip += '</small></div>';
                return tooltip;
            }

            updateHealing() {
                const amt = this.player.getFoodHealing(this.player.food.currentSlot.item);
                document.getElementById('MICSR-heal-amount-Label').textContent = `+${amt}`;
            }

            createCombatStatDisplayCard() {
                this.combatStatCard = new MICSR.Card(this.topContent, '', '60px', true);
                this.combatStatCard.addSectionTitle('Out-of-Combat Stats');
                const combatStatNames = [
                    'Attack Interval',
                    'Min Hit',
                    'Max Hit',
                    'Summoning Max Hit',
                    'Accuracy Rating',
                    'Evasion Rating',
                    'Evasion Rating',
                    'Evasion Rating',
                    'Max Hitpoints',
                    'Damage Reduction',
                    'Auto Eat Threshold',
                    'Drop Doubling (%)',
                    'GP Multiplier',
                ];
                const combatStatIcons = [
                    '',
                    '',
                    '',
                    '',
                    '',
                    this.media.attack,
                    this.media.ranged,
                    this.media.magic,
                    this.media.hitpoints,
                    '',
                    '',
                    '',
                ];
                this.combatStatKeys = [
                    'attackInterval',
                    'minHit',
                    'maxHit',
                    'summoningMaxHit',
                    'maxAttackRoll',
                    'maxDefRoll',
                    'maxRngDefRoll',
                    'maxMagDefRoll',
                    'maxHitpoints',
                    'damageReduction',
                    'autoEatThreshold',
                    'lootBonusPercent',
                    'gpBonus',
                ];
                for (let i = 0; i < combatStatNames.length; i++) {
                    this.combatStatCard.addNumberOutput(combatStatNames[i], 0, 20, (combatStatIcons[i] !== '') ? combatStatIcons[i] : '', `MCS ${this.combatStatKeys[i]} CS Output`);
                }
                this.combatStatCard.addSectionTitle('Plot Options');
                this.plotter.addToggles(this.combatStatCard);
                this.combatStatCard.addSectionTitle('');
                // this.combatStatCard.addButton('Simulate BLOCKING', () => this.blockingSimulateButtonOnClick());
                this.combatStatCard.addButton('Simulate All', () => this.simulateButtonOnClick(false));
                this.combatStatCard.addButton('Simulate Selected', () => this.simulateButtonOnClick(true));
            }

            createIndividualInfoCard() {
                this.zoneInfoCard = new MICSR.Card(this.topContent, '', '100px', true);
                this.zoneInfoCard.addSectionTitle('Monster/Dungeon Info.', 'MCS Zone Info Title');
                this.infoPlaceholder = this.zoneInfoCard.addInfoText('Click on a bar for detailed information on a Monster/Dungeon!');
                this.subInfoCard = new MICSR.Card(this.zoneInfoCard.container, '', '80px');
                this.subInfoCard.addImage(this.media.combat, 48, 'MCS Info Image');
                this.failureLabel = this.subInfoCard.addInfoText('');
                this.failureLabel.style.color = 'red';
                const zoneInfoLabelNames = [];
                for (let i = 0; i < this.plotTypes.length; i++) {
                    if (this.plotTypes[i].isTime) {
                        zoneInfoLabelNames.push(this.plotTypes[i].info + this.selectedTimeShorthand);
                    } else {
                        zoneInfoLabelNames.push(this.plotTypes[i].info);
                    }
                }
                for (let i = 0; i < this.plotTypes.length; i++) {
                    this.subInfoCard.addNumberOutput(zoneInfoLabelNames[i], 'N/A', 20, '', `MCS ${this.plotTypes[i].value} Output`, true);
                }
                // attach tooltip to runesUsedPerSecond element
                let idx = 0;
                for (; idx < this.subInfoCard.container.children.length; idx++) {
                    const child = this.subInfoCard.container.children[idx].lastChild;
                    if (child && [
                        'MCS prayerXpPerSecond Output',
                        'MCS runesUsedPerSecond Output',
                        'MCS gpPerSecond Output',
                        'MCS deathRate Output',
                    ].includes(child.id)) {
                        this.addNoSingletonTippy(child);
                    }
                }
            }

            addNoSingletonTippy(target, options) {
                this.tippyNoSingletonInstances = this.tippyNoSingletonInstances.concat(tippy(target, {
                    ...this.tippyOptions,
                    ...options,
                }));
            }

            createLevelSelectCard() {
                this.levelSelectCard = this.mainTabCard.addTab('Levels', this.media.combat, '', '150px');
                this.levelSelectCard.addSectionTitle('Player Levels');
                this.skillKeys.forEach((skillName) => {
                    let minLevel = 1;
                    if (skillName === 'Hitpoints') {
                        minLevel = 10;
                    }
                    this.levelSelectCard.addNumberInput(skillName, minLevel, minLevel, Infinity, (event) => this.levelInputOnChange(event, skillName));
                });
            }

            createSpellSelectCards() {
                this.spellSelectCard = this.mainTabCard.addPremadeTab(
                    'Spells',
                    this.media.spellbook,
                    new MICSR.TabCard('', false, this.mainTabCard.tabContainer, '100%', '150px'),
                );
                // add title for spellbook tab
                this.spellSelectCard.addSectionTitle('Spells');
                // add tab menu, it was not yet created in the constructor
                this.spellSelectCard.addTabMenu();

                // add spell books
                this.spellSelectCard.addPremadeTab(
                    'Standard',
                    this.media.spellbook,
                    this.createSpellSelectCard('Standard Magic', 'standard'),
                );
                this.spellSelectCard.addPremadeTab(
                    'Curses',
                    this.media.curse,
                    this.createSpellSelectCard('Curses', 'curse'),
                );
                this.spellSelectCard.addPremadeTab(
                    'Auroras',
                    this.media.aurora,
                    this.createSpellSelectCard('Auroras', 'aurora'),
                );
                this.spellSelectCard.addPremadeTab(
                    'Ancient Magicks',
                    this.media.ancient,
                    this.createSpellSelectCard('Ancient Magicks', 'ancient'),
                );

                // add combination rune toggle
                this.spellSelectCard.addToggleRadio(
                    'Use Combination Runes',
                    'combinationRunes',
                    this.player,
                    'useCombinationRunes',
                );
            }

            /**
             * Creates a card for selecting spells
             * @param {string} title The title of the card
             * @param {string} spellType The type of spells to generate the select menu for
             * @return {Card} The created spell select card
             */
            createSpellSelectCard(title, spellType) {
                const newCard = new MICSR.Card(this.spellSelectCard.container, '', '100px');
                newCard.addSectionTitle(title);
                const spells = this.combatData.spells[spellType];
                const spellImages = spells.map((spell) => spell.media);
                const spellNames = spells.map((spell) => spell.name);
                const spellCallbacks = spells.map((_, spellID) => (event) => this.spellButtonOnClick(event, spellID, spellType));
                const tooltips = spells.map((spell) => {
                    let tooltip = `<div class="text-center">${spell.name}<br><small><span class="text-info">`;
                    switch (spellType) {
                        case 'standard':
                            tooltip += `Spell Damage: ${spell.maxHit * numberMultiplier}`;
                            break;
                        case 'aurora':
                            tooltip += describeAurora(spell);
                            break;
                        case 'ancient':
                            tooltip += describeAttack(spell.specialAttack, youNoun, enemyNoun);
                            break;
                        default:
                            tooltip += spell.description;
                    }
                    const runes = combatMenus.spells.standard.getRuneHTML(spell);
                    tooltip += `</span><br><span class="text-warning">Requires:</span><br>${runes}</small></div>`;
                    return tooltip;
                });
                newCard.addImageButtons(spellImages, spellNames, 'Medium', spellCallbacks, tooltips);
                return newCard;
            }

            createPrayerSelectCard() {
                this.prayerSelectCard = this.mainTabCard.addTab('Prayers', this.media.prayer, '', '100px');
                this.prayerSelectCard.addSectionTitle('Prayers');
                const prayerSources = [];
                const prayerNames = [];
                const prayerCallbacks = [];
                const tooltips = [];
                PRAYER.map(x => x).sort((a, b) => a.prayerLevel - b.prayerLevel)
                    .forEach(prayer => {
                        prayerSources.push(prayer.media);
                        prayerNames.push(this.getPrayerName(prayer.id));
                        prayerCallbacks.push(e => this.prayerButtonOnClick(e, prayer.id));
                        tooltips.push(this.createPrayerTooltip(prayer));
                    });
                this.prayerSelectCard.addImageButtons(prayerSources, prayerNames, 'Medium', prayerCallbacks, tooltips);
            }

            createPrayerTooltip(prayer) {
                let tooltip = `<div class="text-center">${prayer.name}<br><small><span class='text-info'>`;
                tooltip += prayer.description;
                tooltip += '<br></span>';
                if (prayer.pointsPerPlayer > 0) {
                    tooltip += `<span class='text-success'>+${(prayer.pointsPerPlayer / 3 / numberMultiplier).toFixed(3)} Prayer XP per damage dealt to enemy</span><br>`;
                }
                tooltip += '<span class="text-warning">Prayer Point Cost:</span><br><span class="text-info">';
                if (prayer.pointsPerPlayer > 0) {
                    tooltip += `${prayer.pointsPerPlayer}</span> per <span class='text-success'>PLAYER</span> attack`;
                }
                if (prayer.pointsPerEnemy > 0) {
                    tooltip += `${prayer.pointsPerEnemy}</span> per <span class='text-danger'>ENEMY</span> attack`;
                }
                if (prayer.pointsPerRegen > 0) {
                    tooltip += `${prayer.pointsPerRegen}</span> per <span class='text-info'>HP REGEN</span>`;
                }
                tooltip += '</small></div>';
                return tooltip;
            }

            createPotionSelectCard() {
                this.potionSelectCard = this.mainTabCard.addTab('Potions', this.media.emptyPotion, '', '100px');
                this.potionSelectCard.addSectionTitle('Potions');
                this.potionSelectCard.addDropdown('Potion Tier', ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'], [0, 1, 2, 3], (e) => this.potionTierDropDownOnChange(e));
                const potionSources = [];
                const potionNames = [];
                const potionCallbacks = [];
                const tooltips = [];
                /** @type {number[]} */
                this.combatPotionIDs = [];
                for (let i = 0; i < Herblore.potions.length; i++) {
                    if (Herblore.potions[i].category === 0) {
                        const potion = items[Herblore.potions[i].potionIDs[0]];
                        potionSources.push(getItemMedia(potion.id));
                        potionNames.push(this.getPotionName(i));
                        potionCallbacks.push((e) => this.potionImageButtonOnClick(e, i));
                        tooltips.push(this.getPotionTooltip(potion));
                        this.combatPotionIDs.push(i);
                    }
                }
                this.potionSelectCard.addImageButtons(potionSources, potionNames, 'Medium', potionCallbacks, tooltips);
            }

            createPetSelectCard() {
                const combatPets = this.petIDs.map(id => PETS[id]);
                this.petSelectCard = this.mainTabCard.addTab('Pets', this.media.pet, '', '100px');
                this.petSelectCard.addSectionTitle('Pets');
                const petImageSources = combatPets.map((pet) => pet.media);
                const petNames = combatPets.map((pet) => pet.name);
                const petButtonCallbacks = this.petIDs.map((petId) => (e) => this.petButtonOnClick(e, petId));
                const tooltips = combatPets.map((pet) => `<div class="text-center">${pet.name}<br><small class='text-info'>${pet.description.replace(/\.$/, '')}</small></div>`);
                this.petSelectCard.addImageButtons(petImageSources, petNames, 'Medium', petButtonCallbacks, tooltips);
                this.petSelectCard.addButton("Clear All Pets", () => {
                    this.import.importPets(Array(PETS.length).fill(false));
                    this.updateCombatStats();
                });
                this.petSelectCard.addImage(PETS[4].media, 100, 'MCS Rock').style.display = 'none';
            }

            createAgilitySelectCard() {
                if (!this.agilitySelectCard) {
                    this.agilitySelectCard = this.mainTabCard.addTab('Agility', this.media.agility, '', '100px');
                    this.agilityCourse = new MICSR.AgilityCourse(
                        this,
                        this.player,
                        [{tag: 'combat', text: 'Combat', media: this.media.combat}],
                    );
                } else {
                    this.agilitySelectCard.clearContainer();
                }
                this.agilityCourse.createAgilityCourseContainer(this.agilitySelectCard, this.agilityCourse.filters[0]);
            }

            agilityCourseCallback() {
                this.updateCombatStats();
            }

            createAstrologySelectCard() {
                let initial = false;
                if (!this.astrologySelectCard) {
                    this.astrologySelectCard = this.mainTabCard.addTab('Astrology', this.media.astrology, '', '100px');
                    this.astrologySelected = undefined;
                    this.skipConstellations = [0, 2, 7];
                    initial = true;
                    this.uniqueModifiers = [];
                    for (const constellation of Astrology.constellations) {
                        const uniques = {};
                        for (const modifiers of constellation.uniqueModifiers) {
                            for (const modifier of modifiers) {
                                uniques[modifier] = true;
                            }
                        }
                        this.uniqueModifiers.push(uniques);
                    }
                } else {
                    this.astrologySelectCard.clearContainer();
                }
                this.astrologySelectCard.addSectionTitle('Astrology');
                this.constellationContainers = [];
                this.constellationModifierContainers = [];
                const card = this.astrologySelectCard;
                let index = 0;
                for (const constellation of Astrology.constellations) {
                    const constellationIndex = index;
                    index += 1;
                    // create constellation modifier object
                    let activeConstellationModifiers = {};
                    if (initial) {
                        this.player.activeAstrologyModifiers.push(activeConstellationModifiers);
                    } else {
                        activeConstellationModifiers = this.player.activeAstrologyModifiers[constellationIndex]
                    }
                    // create constellation container
                    const cc = card.createCCContainer();
                    this.constellationContainers.push(cc);
                    if (this.skipConstellations.includes(constellationIndex)) {
                        this.constellationModifierContainers.push([]);
                        continue;
                    }
                    // constellation symbol and skills
                    const constellationImage = card.createImageButton(
                        constellation.media,
                        `constellation-${constellationIndex}`,
                        () => {
                        },
                        'Small',
                    );
                    cc.appendChild(card.createLabel(`${constellation.name} (${constellation.level})`));
                    cc.appendChild(constellationImage);
                    cc.appendChild(card.createImage(SKILLS[constellation.skills[0]].media, 20));
                    cc.appendChild(card.createImage(SKILLS[constellation.skills[1]].media, 20));
                    const standardLabel = card.createLabel(`+0%`)
                    standardLabel.id = `MICSR-${constellation.name}-standard-percentage`;
                    cc.appendChild(standardLabel);
                    cc.appendChild(card.container.appendChild(card.createImage(this.media.standardStar, 20)));
                    const uniqueLabel = card.createLabel(`+0%`);
                    uniqueLabel.id = `MICSR-${constellation.name}-unique-percentage`;
                    cc.appendChild(uniqueLabel);
                    cc.appendChild(card.container.appendChild(card.createImage(this.media.uniqueStar, 20)));
                    // add constellation to astrology card
                    card.container.appendChild(cc);
                    constellationImage.parentElement.onclick = () => this.toggleAstrologySelectCard(constellationIndex);
                    // image buttons to open modifier selection
                    let elementList = [];
                    const standardStar = card.createImage(this.media.standardStar, 40);
                    standardStar.id = `MICSR-${constellation.name}-Standard-Image`;
                    card.container.appendChild(standardStar);
                    this.createStandardAstrologyModifiers(card, elementList, constellation, activeConstellationModifiers);
                    const uniqueStar = card.createImage(this.media.uniqueStar, 40);
                    uniqueStar.id = `MICSR-${constellation.name}-Unique-Image`;
                    card.container.appendChild(uniqueStar);
                    this.createUniqueAstrologyModifiers(card, elementList, constellation, activeConstellationModifiers);
                    this.constellationModifierContainers.push(elementList);
                }
                this.astrologySelectCard.addButton('Clear All Star Modifiers', () => this.clearAstrology());
            }

            clearAstrology() {
                // set modifiers to 0
                this.player.activeAstrologyModifiers.forEach((constellation, idx) => {
                    if (this.skipConstellations.includes(idx)) {
                        return;
                    }
                    for (const modifier in constellation) {
                        if (constellation[modifier].push) {
                            constellation[modifier].forEach(x =>
                                x[1] = 0
                            );
                        } else {
                            constellation[modifier] = 0;
                        }
                    }
                });
                // set UI to 0
                this.constellationModifierContainers.forEach(containers => containers.forEach(x =>
                    document.getElementById(x).value = 0
                ));
                // update summary
                this.updateAstrologySummary();
                // update stats
                this.updateCombatStats();
            }

            toggleAstrologySelectCard(selected = undefined) {
                this.astrologySelected = this.astrologySelected === selected ? undefined : selected;
                if (this.astrologySelected === undefined) {
                    document.getElementById('MCS Clear All Star Modifiers Button').style.display = 'block';
                } else {
                    document.getElementById('MCS Clear All Star Modifiers Button').style.display = 'none';
                }
                Astrology.constellations.forEach((constellation, index) => {
                    if (this.skipConstellations.includes(index)) {
                        return;
                    }
                    if (this.astrologySelected !== undefined && this.astrologySelected !== index) {
                        this.constellationContainers[index].style.display = 'none';
                    } else {
                        this.constellationContainers[index].style.display = 'block';
                    }
                    const els = [
                        document.getElementById(`MICSR-${constellation.name}-Standard-Image`),
                        document.getElementById(`MICSR-${constellation.name}-Unique-Image`),
                    ]
                    for (const id of this.constellationModifierContainers[index]) {
                        const el = document.getElementById(id).parentElement;
                        els.push(el);
                    }
                    for (const el of els) {
                        if (this.astrologySelected !== index) {
                            el.style.display = 'none';
                        } else {
                            el.style.display = 'flex';
                        }
                    }
                });
            }

            createStandardAstrologyModifiers(card, elementList, constellation, activeConstellationModifiers) {
                const stdMod = [];
                constellation.skills.forEach((skillID, idx) => {
                    if (!MICSR.showModifiersInstance.relevantModifiers.combat.skillIDs.includes(skillID)) {
                        return;
                    }
                    // summoning has no relevant modifiers other than increasedSkillXP
                    if (Skills.Summoning === skillID) {
                        stdMod.push([skillID, 'increasedSkillXP']);
                        return;
                    }
                    // for other combat skills all modifiers are relevant
                    constellation.standardModifiers[idx].forEach(modifier =>
                        stdMod.push([modifierData[modifier].isSkill ? skillID : undefined, modifier])
                    );
                });
                const alreadyAdded = [];
                stdMod.forEach(x => {
                    const skillID = x[0];
                    const modifier = x[1];
                    if (skillID !== undefined) {
                        card.addNumberInput(`${constellation.name}-${Skills[skillID]}-${modifier}`, 0, 0, 15, (event) => {
                            activeConstellationModifiers[modifier] = activeConstellationModifiers[modifier].map(y => {
                                if (y[0] !== skillID) {
                                    return y;
                                }
                                return [skillID, parseInt(event.currentTarget.value)];
                            });
                            if (activeConstellationModifiers[modifier].find(x => x[0] === skillID) === undefined) {
                                activeConstellationModifiers[modifier].push([skillID, parseInt(event.currentTarget.value)]);
                            }
                            this.updateAstrologySummary();
                            this.updateCombatStats();
                        });
                        const id = `MCS ${constellation.name}-${Skills[skillID]}-${modifier} Input`;
                        elementList.push(id);
                        card.container.lastChild.firstChild.textContent = `${Skills[skillID]} ${modifier}`;
                        if (activeConstellationModifiers[modifier] === undefined) {
                            activeConstellationModifiers[modifier] = [];
                        }
                        activeConstellationModifiers[modifier].push([skillID, 0]);
                    } else if (!alreadyAdded.includes(modifier)) {
                        card.addNumberInput(`${constellation.name}-${modifier}`, 0, 0, 15, (event) => {
                            activeConstellationModifiers[modifier] = parseInt(event.currentTarget.value);
                            this.updateAstrologySummary();
                            this.updateCombatStats();
                        });
                        const id = `MCS ${constellation.name}-${modifier} Input`;
                        elementList.push(id);
                        card.container.lastChild.firstChild.textContent = `${modifier}`;
                        activeConstellationModifiers[modifier] = 0;
                        alreadyAdded.push(modifier);
                    }
                });
            }

            createUniqueAstrologyModifiers(card, elementList, constellation, activeConstellationModifiers) {
                // unique modifiers
                const uniqMod = constellation.uniqueModifiers.reduce((acc, val) => acc.concat(val), []).filter(m =>
                    MICSR.showModifiersInstance.relevantModifiers.combat.names.includes(m)
                    || MICSR.showModifiersInstance.relevantModifiers.combat.names.includes(m.substring(9))
                );
                uniqMod.forEach(modifier => {
                    card.addNumberInput(`${constellation.name}-${modifier}`, 0, 0, 15, (event) => {
                        activeConstellationModifiers[modifier] = parseInt(event.currentTarget.value);
                        this.updateAstrologySummary();
                        this.updateCombatStats();
                    });
                    const id = `MCS ${constellation.name}-${modifier} Input`;
                    elementList.push(id);
                    card.container.lastChild.firstChild.textContent = `${modifier}`;
                    activeConstellationModifiers[modifier] = 0;
                });
            }

            updateAstrologySummary() {
                this.player.activeAstrologyModifiers.forEach((constellation, idx) => {
                    if (this.skipConstellations.includes(idx)) {
                        return;
                    }
                    let standard = 0;
                    let unique = 0;
                    for (const modifier in constellation) {
                        let val = 0;
                        if (constellation[modifier].push) {
                            constellation[modifier].forEach(x =>
                                val += x[1]
                            );
                        } else {
                            val += constellation[modifier];
                        }
                        if (this.uniqueModifiers[idx][modifier]) {
                            unique += val;
                        } else {
                            standard += val;
                        }
                    }
                    document.getElementById(`MICSR-${Astrology.constellations[idx].name}-standard-percentage`).textContent = `+${standard}%`;
                    document.getElementById(`MICSR-${Astrology.constellations[idx].name}-unique-percentage`).textContent = `+${unique}%`;
                });
            }

            createLootOptionsCard() {
                if (!this.lootSelectCard) {
                    this.lootSelectCard = this.mainTabCard.addTab('Loot Options', this.media.loot, '', '150px');
                } else {
                    this.lootSelectCard.clearContainer();
                }
                // drop chance options
                this.lootSelectCard.addSectionTitle('Drop Chance Options');
                this.lootSelectCard.addToggleRadio(
                    'Only Selected Monster',
                    'selectedMonster',
                    this.dropListFilters,
                    'selectedMonster',
                    this.dropListFilters.selectedMonster, // default
                    25, // default
                    () => {
                        this.createLootOptionsCard();
                        this.updatePlotForLoot();
                    },
                );
                this.lootSelectCard.addToggleRadio(
                    'Only Undiscovered',
                    'onlyUndiscovered',
                    this.dropListFilters,
                    'onlyUndiscovered',
                    this.dropListFilters.onlyUndiscovered, // default
                    25, // default
                    () => {
                        this.createLootOptionsCard();
                        this.updatePlotForLoot();
                    },
                );
                const droppedItems = this.buildItemDropList()
                let index = droppedItems.indexOf(this.combatData.dropSelected);
                if (index === -1) {
                    index = 0;
                    this.combatData.dropSelected = -1;
                    this.updatePlotForLoot();
                }
                const dropdown = this.lootSelectCard.addDropdown(
                    'Choose Item',
                    droppedItems.map((itemID) => this.getItemName(itemID)),
                    droppedItems,
                    (event) => this.dropChanceOnChange(event),
                );
                dropdown.selectedIndex = index;

                // gp options
                this.lootSelectCard.addSectionTitle('');
                this.lootSelectCard.addSectionTitle('GP/s Options');
                this.lootSelectCard.addRadio(
                    'Sell Bones',
                    25,
                    'sellBones',
                    ['Yes', 'No'],
                    [
                        (e) => this.sellBonesRadioOnChange(e, true),
                        (e) => this.sellBonesRadioOnChange(e, false),
                    ],
                    this.loot.sellBones ? 0 : 1,
                );
                this.lootSelectCard.addRadio(
                    'Convert Shards',
                    25,
                    'convertShards',
                    ['Yes', 'No'],
                    [
                        (e) => this.convertShardsRadioOnChange(e, true),
                        (e) => this.convertShardsRadioOnChange(e, false),
                    ],
                    this.loot.convertShards ? 0 : 1,
                );
                this.lootSelectCard.addRadio(
                    'High Alch Drops',
                    25,
                    'alchHighValueItems',
                    ['Yes', 'No'],
                    [
                        (e) => this.alchHighValueItemsRadioOnChange(e, true),
                        (e) => this.alchHighValueItemsRadioOnChange(e, false),
                    ],
                    this.loot.alchHighValueItems ? 0 : 1,
                );
                this.lootSelectCard.addNumberInput(
                    'Alch Min Sale Value',
                    this.loot.alchemyCutoff,
                    0,
                    Infinity,
                    (event) => this.alchemyCutoffInputOnChange(event),
                );
            }

            buildItemDropList() {
                // construct map
                const lootMap = {};
                const addToLootMap = (monster) => {
                    if (monster.lootTable) {
                        monster.lootTable.forEach(entry => {
                            const itemID = entry[0];
                            lootMap[itemID] = true;
                            const dropTable = items[itemID].dropTable;
                            if (dropTable) {
                                dropTable.forEach(x => lootMap[x[0]] = true);
                            }
                        });
                    }
                    if (monster.bones > -1) {
                        lootMap[monster.bones] = true;
                        const upgradeID = items[monster.bones].trimmedItemID;
                        if (upgradeID) {
                            lootMap[upgradeID] = true;
                            const dropTable = items[upgradeID].dropTable;
                            if (dropTable) {
                                dropTable.forEach(x => lootMap[x[0]] = true);
                            }
                        }
                    }
                };
                if (this.dropListFilters.selectedMonster) {
                    if (!this.isViewingDungeon) {
                        if (this.barIsDungeon(this.selectedBar)) {
                            const dungeonID = this.barMonsterIDs[this.selectedBar];
                            const monsters = MICSR.dungeons[dungeonID].monsters;
                            const bossID = monsters[monsters.length - 1];
                            addToLootMap(MONSTERS[bossID]);
                        } else if (this.barIsTask(this.selectedBar)) {
                            const taskID = this.barMonsterIDs[this.selectedBar] - MICSR.dungeons.length;
                            const monsters = this.simulator.slayerTaskMonsters[taskID];
                            monsters.map(id => MONSTERS[id]).forEach(monster => addToLootMap(monster));
                        } else {
                            addToLootMap(MONSTERS[this.barMonsterIDs[this.selectedBar]]);
                        }
                    } else if (this.loot.godDungeonIDs.includes(this.viewedDungeonID)) {
                        const monsterID = this.getSelectedDungeonMonsterID();
                        addToLootMap(MONSTERS[monsterID]);
                    }
                } else {
                    MONSTERS.forEach(monster => addToLootMap(monster));
                }
                // construct list
                let lootList = Object.getOwnPropertyNames(lootMap).map(x => parseInt(x));
                // apply undiscovered filter
                if (this.dropListFilters.onlyUndiscovered) {
                    lootList = lootList.filter(itemID => {
                        return game.stats.Items.get(itemID, ItemStats.TimesFound) === 0;
                    });
                }
                // sort by name
                return [-1, ...lootList.sort((a, b) => items[a].name > items[b].name ? 1 : -1)];
            }

            dropChanceOnChange(event) {
                this.combatData.dropSelected = parseInt(event.currentTarget.selectedOptions[0].value);
                this.updatePlotForLoot();
            }

            getSelectedDropLabel() {
                if (this.combatData.dropSelected === -1) {
                    return `Drops/${this.selectedTimeShorthand}`;
                }
                return `${this.getItemName(this.combatData.dropSelected)}/${this.selectedTimeShorthand}`;
            }

            createSimulationAndExportCard() {
                this.simOptionsCard = this.mainTabCard.addTab('Simulation Options', this.media.settings, '', '150px');
                // advanced options
                this.simOptionsCard.addSectionTitle('Advanced Options');
                this.simOptionsCard.addNumberInput('# Trials', MICSR.trials, 1, 1e5, (event) => this.numTrialsInputOnChange(event));
                this.simOptionsCard.addNumberInput('Max tick/trial', MICSR.maxTicks, 1, 1e8, (event) => this.maxTicksInputOnChange(event));
                this.simOptionsCard.addToggleRadio(
                    'Heal After Death',
                    'healAfterDeath',
                    this.player,
                    'healAfterDeath',
                    this.player.healAfterDeath,
                );
                this.simOptionsCard.addToggleRadio(
                    'Has Runes',
                    'hasRunes',
                    this.player,
                    'hasRunes',
                    this.player.hasRunes,
                );
                // settings export and import
                this.simOptionsCard.container.appendChild(document.createElement('br'));
                this.simOptionsCard.addSectionTitle('Settings Export - Import');
                this.simOptionsCard.addButton('Export Settings', () => this.exportSettingButtonOnClick());
                this.importedSettings = {};
                this.simOptionsCard.addTextInput('Settings JSON:', '', (event) => {
                    try {
                        this.importedSettings = JSON.parse(event.currentTarget.value)
                    } catch {
                        this.notify('Ignored invalid JSON settings!', 'danger');
                        this.importedSettings = {};
                    }
                });
                this.simOptionsCard.addButton('Import Settings', () => {
                    if (!this.importedSettings) {
                        this.notify('No settings to import.', 'danger');
                        return;
                    }
                    this.import.importSettings(this.importedSettings);
                    this.import.update();
                });
                // data export
                this.simOptionsCard.container.appendChild(document.createElement('br'));
                this.simOptionsCard.addSectionTitle('Data Export');
                this.simOptionsCard.addToggleRadio(
                    'Dungeon Monsters',
                    `DungeonMonsterExportRadio`,
                    this.dataExport.exportOptions,
                    'dungeonMonsters',
                    this.dataExport.exportOptions.dungeonMonsters,
                );
                this.simOptionsCard.addToggleRadio(
                    'Non-Simulated',
                    `NonSimmedExportRadio`,
                    this.dataExport.exportOptions,
                    'nonSimmed',
                    this.dataExport.exportOptions.nonSimmed,
                );
                this.simOptionsCard.addButton('Export Data', () => this.exportDataOnClick());
            }

            createCompareCard() {
                if (!this.compareCard) {
                    this.trackHistory = false;
                    this.savedSimulations = [];
                    this.compareCard = this.mainTabCard.addTab('Saved Simulations', this.media.statistics, '', '150px');
                } else {
                    this.compareCard.clearContainer();
                }
                this.compareCard.addButton('Clear History', () => {
                    this.savedSimulations = [];
                    this.createCompareCard();
                });
                this.compareCard.addRadio('Track History', 25, 'trackHistory', ['Yes', 'No'], [
                    () => this.trackHistory = true,
                    () => this.trackHistory = false,
                ], this.trackHistory ? 0 : 1);

                this.compareCard.addSectionTitle('Saved Simulations');
                this.savedSimulations.forEach((_, i) => {
                    this.compareCard.addButton(`Load simulation ${i}`, () => this.loadSavedSimulation(i));
                });
            }

            loadSavedSimulation(idx) {
                const simulation = this.savedSimulations[idx];
                if (!simulation) {
                    MICSR.error(`Unable to load simulation with index ${idx}`);
                    return;
                }
                // load settings
                this.import.importSettings(simulation.settings);
                this.import.update();
                // load results
                for (const id in simulation.monsterSimData) {
                    this.simulator.monsterSimData[id] = {...simulation.monsterSimData[id]};
                }
                this.simulator.performPostSimAnalysis();
                this.updateDisplayPostSim();
            }

            createConsumablesCard() {
                this.consumablesCard = this.mainTabCard.addPremadeTab(
                    'Consumables',
                    this.media.bank,
                    new MICSR.TabCard('consumables', false, this.mainTabCard.tabContainer, '100%', '150px'),
                );
                this.consumables = new MICSR.Consumables(this);
            }

            /** Adds a multi-button with equipment to the equipment select popup
             * @param {Card} card The parent card
             * @param {number} equipmentSlot The equipment slot
             * @param {Function} filterFunction Filter equipment with this function
             * @param {Function} sortFunction Sort equipment by this key
             */
            addEquipmentMultiButton(card, equipmentSlot, filterFunction, sortFunction = item => item.id, golbinRaid = false) {
                const menuItems = this.equipmentSubsets[equipmentSlot].filter(filterFunction).filter(x => !!x.golbinRaidExclusive === golbinRaid);
                const sortKey = item => {
                    const x = sortFunction(item);
                    return x ? x : 0;
                }
                menuItems.sort((a, b) => sortKey(a) - sortKey(b));
                const buttonMedia = menuItems.map((item) => this.getItemMedia(item));
                const buttonIds = menuItems.map((item) => this.getItemName(item.id));
                const buttonCallbacks = menuItems.map((item) => () => this.equipItem(equipmentSlot, item.id));
                const tooltips = menuItems.map((item) => this.getEquipmentTooltip(equipmentSlot, item));
                card.addImageButtons(buttonMedia, buttonIds, 'Small', buttonCallbacks, tooltips, '100%');
            }

            /**
             * Filters an array by if the array item has the key
             * @param {string} key
             * @param {Object} item
             * @return {boolean}
             */
            filterIfHasKey(key, item) {
                return key in item || item.id === -1;
            }

            filterIfHasLevelReq(item, skillID) {
                if (item.id === -1) {
                    return true;
                }
                if (this.force[skillID].includes(item.id)) {
                    return true;
                }
                return this.getItemLevelReq(item, skillID) > 0;
            }

            getItemLevelReq(item, skillID) {
                if (skillID === Skills.Summoning) {
                    return item.summoningLevel | 0;
                }
                let req = 0;
                if (item.equipRequirements === undefined) {
                    return req;
                }
                const levelReqs = item.equipRequirements
                    .filter(x => x.type === 'Level')
                    .map(x => x.levels)
                    .reduce((a, b) => [...a, ...b], []);
                for (let levelReq of levelReqs) {
                    if (levelReq.skill === skillID) {
                        req = Math.max(req, levelReq.level);
                    }
                }
                return req;
            }

            /**
             * Filters equipment by if it has no level requirements
             * @param {Object} item
             * @return {boolean}
             */
            filterIfHasNoLevelReq(item) {
                if (item.id === -1) {
                    return true;
                }
                const skillIDs = [
                    Skills.Defence,
                    Skills.Ranged,
                    Skills.Magic,
                ]
                for (let skillID of skillIDs) {
                    if (this.getItemLevelReq(item, skillID) || (this.force[skillID] && this.force[skillID].includes(item.id))) {
                        return false;
                    }
                }
                return true;
            }

            /**
             * Filter an item array by the ammoType
             * @param {number} type
             * @param {Object} item
             * @return {boolean}
             */
            filterByAmmoType(type, item) {
                return item.ammoType === type || item.id === -1;
            }

            filterNoAmmoType(item) {
                return item.ammoType === undefined || item.id === -1;
            }

            /**
             * Filter an item array by the ammoType
             * @param {number} type
             * @param {Object} item
             * @return {boolean}
             */
            filterByAmmoReq(type, item) {
                return item.ammoTypeRequired === type || item.id === -1;
            }

            /**
             * Filter an item if it's twohanded property matches the given state
             * @param {boolean} is2H Filter if twohanded matches this
             * @param {Object} item
             * @return {boolean}
             */
            filterByTwoHanded(is2H, item) {
                if (item.id === -1) {
                    return true;
                }
                return this.isTwoHanded(item) === is2H;
            }

            isTwoHanded(item) {
                return item.occupiesSlots && item.occupiesSlots.includes('Shield');
            }

            filterMagicDamage(item) {
                if (item.id === -1) {
                    return true;
                }
                if (item.modifiers === undefined) {
                    return false;
                }
                return item.modifiers.increasedMinAirSpellDmg > 0
                    || item.modifiers.increasedMinEarthSpellDmg > 0
                    || item.modifiers.increasedMinFireSpellDmg > 0
                    || item.modifiers.increasedMinWaterSpellDmg > 0
            }

            filterSlayer(item) {
                if (item.id === -1) {
                    return true;
                }
                if (item.modifiers === undefined) {
                    return false;
                }
                if (item.modifiers.increasedSkillXP && item.modifiers.increasedSkillXP.filter(x => x[0] === Skills.Slayer).length > 0) {
                    return true;
                }
                return item.modifiers.increasedSlayerAreaEffectNegationFlat > 0
                    || item.modifiers.increasedDamageToSlayerTasks > 0
                    || item.modifiers.increasedDamageToSlayerAreaMonsters > 0
                    || item.modifiers.increasedSlayerTaskLength > 0
                    || item.modifiers.increasedSlayerCoins > 0
            }

            filterRemainingPassive(item) {
                if (item.id === -1) {
                    return true;
                }
                return !this.filterMagicDamage(item) && !this.filterSlayer(item)
            }

            /**
             * Filter an item by the weapon type
             * @param {string} weaponType
             * @param {Object} item
             * @return {boolean}
             */
            filterByWeaponType(attackType, item) {
                if (item.id === -1) {
                    return true;
                }
                return item.attackType === attackType;
            }

            /**
             * Filter by combat summon
             * @return {boolean}
             */
            filterCombatSummon(item, combat) {
                if (item.id === -1) {
                    return true;
                }
                let maxhit = 0;
                if (item.equipmentStats) {
                    const maxhitList = item.equipmentStats.filter(x => x.key === 'summoningMaxhit');
                    if (maxhitList.length > 0) {
                        maxhit = maxhitList[0].value;
                    }
                }
                return maxhit > 0 === combat;
            }

            /**
             * Filter by returning all elements
             * @return {boolean}
             */
            returnTrue() {
                return true;
            }

            /**
             * Change a button's classes to show that it is selected
             * @param {HTMLButtonElement} button
             */
            selectButton(button) {
                button.classList.add('btn-primary');
                button.classList.remove('btn-outline-dark');
            }

            /**
             * Change a button's classes to show that it is not selected
             * @param {HTMLButtonElement} button
             */
            unselectButton(button) {
                button.classList.remove('btn-primary');
                button.classList.add('btn-outline-dark');
            }

            /**
             * Creates an equipment popup
             * @param {number} equipmentSlot
             * @return {HTMLDivElement}
             */
            createEquipmentPopup(equipmentSlot) {
                const equipmentSelectPopup = document.createElement('div');
                equipmentSelectPopup.className = 'mcsPopup';
                const equipmentSelectCard = new MICSR.Card(equipmentSelectPopup, '', '600px');
                const triSplit = [0, 1, 2, 3, 5, 8];
                const noSplit = [6, 7, 10];
                if (triSplit.includes(equipmentSlot)) {
                    equipmentSelectCard.addSectionTitle('Melee');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot,
                        item => this.filterIfHasLevelReq(item, Skills.Defence),
                        x => this.filterIfHasLevelReq(x, Skills.Defence)
                    );
                    equipmentSelectCard.addSectionTitle('Ranged');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot,
                        item => this.filterIfHasLevelReq(item, Skills.Ranged),
                        x => this.filterIfHasLevelReq(x, Skills.Ranged)
                    );
                    equipmentSelectCard.addSectionTitle('Magic');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot,
                        item => this.filterIfHasLevelReq(item, Skills.Magic),
                        x => this.filterIfHasLevelReq(x, Skills.Magic)
                    );
                    if (this.equipmentSubsets[equipmentSlot].filter((item) => this.filterIfHasNoLevelReq(item)).length > 1) {
                        equipmentSelectCard.addSectionTitle('Other');
                        this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterIfHasNoLevelReq(item), x => x.name);
                    }
                } else if (noSplit.includes(equipmentSlot)) {
                    equipmentSelectCard.addSectionTitle(EquipmentSlots[equipmentSlot]);
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, () => this.returnTrue());
                } else if (equipmentSlot === 4) {
                    equipmentSelectCard.addSectionTitle('1H Melee');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => {
                        return this.filterByTwoHanded(false, item) && this.filterByWeaponType('melee', item);
                    }, x => this.getItemLevelReq(x, Skills.Attack));
                    equipmentSelectCard.addSectionTitle('2H Melee');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => {
                        return this.filterByTwoHanded(true, item) && this.filterByWeaponType('melee', item);
                    }, x => this.getItemLevelReq(x, Skills.Attack));
                    equipmentSelectCard.addSectionTitle('1H Ranged');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => {
                        return this.filterByTwoHanded(false, item) && this.filterByWeaponType('ranged', item);
                    }, x => this.getItemLevelReq(x, Skills.Ranged));
                    equipmentSelectCard.addSectionTitle('2H Ranged');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => {
                        return this.filterByTwoHanded(true, item) && this.filterByWeaponType('ranged', item);
                    }, x => this.getItemLevelReq(x, Skills.Ranged));
                    equipmentSelectCard.addSectionTitle('1H Magic');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => {
                        return this.filterByTwoHanded(false, item) && this.filterByWeaponType('magic', item);
                    }, x => this.getItemLevelReq(x, Skills.Magic));
                    equipmentSelectCard.addSectionTitle('2H Magic');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => {
                        return this.filterByTwoHanded(true, item) && this.filterByWeaponType('magic', item);
                    }, x => this.getItemLevelReq(x, Skills.Magic));
                } else if (equipmentSlot === 9) {
                    equipmentSelectCard.addSectionTitle('Arrows');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterByAmmoType(0, item), x => this.getItemLevelReq(x, Skills.Ranged));
                    equipmentSelectCard.addSectionTitle('Bolts');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterByAmmoType(1, item), x => this.getItemLevelReq(x, Skills.Ranged));
                    equipmentSelectCard.addSectionTitle('Javelins');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterByAmmoType(2, item), x => this.getItemLevelReq(x, Skills.Ranged));
                    equipmentSelectCard.addSectionTitle('Throwing Knives');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterByAmmoType(3, item), x => this.getItemLevelReq(x, Skills.Ranged));
                    equipmentSelectCard.addSectionTitle('Other');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterNoAmmoType(item), x => x.name);
                } else if (equipmentSlot === equipmentSlotData.Passive.id) {
                    equipmentSelectCard.addSectionTitle('Magic Damage');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterMagicDamage(item), x => x.name);
                    equipmentSelectCard.addSectionTitle('Slayer');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterSlayer(item), x => x.name);
                    equipmentSelectCard.addSectionTitle('Other');
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterRemainingPassive(item), x => x.name);
                } else if (equipmentSlot === equipmentSlotData.Summon1.id || equipmentSlot === equipmentSlotData.Summon2.id) {
                    equipmentSelectCard.addSectionTitle('Combat Familiars')
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterCombatSummon(item, true), x => this.getItemLevelReq(x, Skills.Summoning));
                    equipmentSelectCard.addSectionTitle('Non-Combat Familiars')
                    this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, (item) => this.filterCombatSummon(item, false), x => this.getItemLevelReq(x, Skills.Summoning));
                } else {
                    throw Error(`Invalid equipmentSlot: ${equipmentSlot}`);
                }
                equipmentSelectCard.addSectionTitle('Golbin Raid Exclusive');
                this.addEquipmentMultiButton(equipmentSelectCard, equipmentSlot, () => true, x => x.name, true);
                return equipmentSelectPopup;
            }

            // Callback Functions for equipment select card
            /**
             * Equips an item to an equipment slot
             * @param {number} slotID
             * @param {number} itemId
             * @memberof McsApp
             */
            equipItem(slotID, itemId) {
                let slot = EquipmentSlots[slotID];
                const item = MICSR.getItem(itemId, slot);
                // determine equipment slot
                if (item.occupiesSlots && item.occupiesSlots.includes(slot)) {
                    slot = item.validSlots[0];
                    slotID = equipmentSlotData[slot].id;
                }
                // clear previous item
                let slots = [slot];
                if (item.occupiesSlots) {
                    slots = [
                        slot,
                        ...item.occupiesSlots,
                    ]
                }
                slots.forEach(slotToOccupy => {
                    const equipment = this.player.equipment;
                    const prevSlot = equipment.getRootSlot(slotToOccupy);
                    equipment.slots[prevSlot].occupies.forEach(occupied => {
                        this.setEquipmentImage(equipmentSlotData[occupied].id, -1);
                    });
                    this.player.unequipItem(0, prevSlot);
                    this.setEquipmentImage(equipmentSlotData[prevSlot].id, -1);
                });
                // equip new item
                this.player.equipItem(itemId, 0, slot);
                this.setEquipmentImage(slotID, itemId);
                // update stats
                this.updateStyleDropdowns();
                this.updateSpellOptions();
                this.updateCombatStats();
            }

            /**
             * Change the equipment image
             * @param {number} equipmentSlot
             * @param {number} itemId
             * @param {boolean} occupy
             */
            setEquipmentImage(equipmentSlot, itemId, occupy = true) {
                const slotKey = EquipmentSlots[equipmentSlot];
                const img = document.getElementById(`MCS ${slotKey} Image`);
                const item = MICSR.getItem(itemId, slotKey);
                img.src = this.getItemMedia(item);
                img._tippy.setContent(this.getEquipmentTooltip(equipmentSlot, item));
                if (occupy && item.occupiesSlots) {
                    item.occupiesSlots.forEach(slot => this.setEquipmentImage(equipmentSlotData[slot].id, itemId, false));
                }
            }

            /**
             * Gets the content for the tooltip of a piece of equipment
             *
             * @param equipmentSlot The equipment slot of the item
             * @param item The item to get the tooltip for
             * @returns {string} The tooltip content
             */
            getEquipmentTooltip(equipmentSlot, item) {
                if (!item) {
                    return EquipmentSlots[equipmentSlot];
                }

                let tooltip = `<div class="text-center">${item.name}<br><small>`;

                if (item.hasSpecialAttack) {
                    for (let special of item.specialAttacks) {
                        tooltip += `<span class='text-danger'>${special.name} (${special.defaultChance}%): </span><span class='text-warning'>${describeAttack(special, youNoun, enemyNoun)}</span><br>`;
                    }
                }

                const pushBonus = (list, header = '', footer = '') => {
                    const statBonuses = [];
                    if (item.equipmentStats === undefined) {
                        return;
                    }
                    list.forEach(bonusInfo => {
                        const name = bonusInfo[0];
                        const tag = bonusInfo[1];
                        const suffix = bonusInfo[2] === undefined ? '' : bonusInfo[2];
                        const value = item.equipmentStats.filter(y => y.key === tag).reduce((a, b) => a + b.value, 0);
                        if (value !== 0) {
                            statBonuses.push(this.getTooltipStatBonus(name, value, suffix));
                        }
                    });
                    if (statBonuses.length > 0) {
                        tooltip += header;
                        tooltip += statBonuses.join(', ');
                        tooltip += footer;
                    }
                }

                pushBonus(
                    [
                        ['Attack Speed', 'attackSpeed'],
                        ['Melee Strength', 'meleeStrengthBonus'],
                        ['Stab', 'stabAttackBonus'],
                        ['Slash', 'slashAttackBonus'],
                        ['Block', 'blockAttackBonus'],
                        ['Ranged Strength', 'rangedStrengthBonus'],
                        ['Ranged Attack', 'rangedAttackBonus'],
                        ['Magic Damage', 'magicDamageBonus', '%'],
                        ['Magic Attack', 'magicAttackBonus'],
                    ],
                    `<div>Offence:</div><span>`,
                    '</span>',
                );

                pushBonus(
                    [
                        ['Damage Reduction', 'damageReduction', '%'],
                        ['Melee Defence', 'defenceBonus'],
                        ['Ranged Defence', 'rangedDefenceBonus'],
                        ['Magic Defence', 'magicDefenceBonus'],
                    ],
                    `<div>Defence:</div><span>`,
                    '</span>',
                );

                if (item.modifiers) {
                    const printedModifiers = this.printRelevantModifiers(item.modifiers, {
                        headerTag: 'div',
                        header: 'Combat Modifiers:',
                        tag: 'div',
                        style: 'white-space: nowrap;',
                    });
                    if (printedModifiers.passives.length > 0) {
                        tooltip += printedModifiers.header + printedModifiers.passives;
                    }
                }

                if (item.equipRequirements) {
                    const requirements = [];
                    const levelReqs = item.equipRequirements.find(x => x.type === 'Level');
                    if (levelReqs) {
                        this.skillKeys.forEach(skill => {
                            const levelReq = levelReqs.levels.find(x => x.skill === Skills[skill]);
                            if (levelReq) {
                                requirements.push(`${skill} Level ${levelReq.level}`);
                            }
                        });
                    }
                    if (requirements.length > 0) {
                        tooltip += `<div>Requires:</div><span class="text-warning">${requirements.join(', ')}</span>`;
                    }
                }

                tooltip += '</small></div>';
                return tooltip;
            }

            /**
             * Returns a span containing a description of the given stat bonus
             * @param {string} stat The name of the stat
             * @param {number} bonus The value of the bonus
             * @param {string} suffix A suffix to add after the bonus
             * @returns {HTMLSpanElement}
             */
            getTooltipStatBonus(stat, bonus, suffix = '') {
                return `<span style="white-space: nowrap;" class="text-${bonus > 0 ? 'success">+' : 'danger">'}${bonus}${suffix} ${stat}</span>`;
            }

            /**
             * Returns an image element containing the given icon for use in a tooltip
             * @param {string} icon The source of the icon
             * @returns {HTMLImageElement} The image element
             */
            getTooltipIcon(icon) {
                return `<img class="tooltip-icon" src="${icon}">`;
            }

            /**
             * Updates the style selection dropdowns
             * @memberof McsApp
             */
            updateStyleDropdowns() {
                const itemID = this.player.equipmentID(equipmentSlotData.Weapon.id);
                const item = MICSR.getItem(itemID, 'Weapon');
                this.disableStyleDropdown('melee');
                this.disableStyleDropdown('ranged');
                this.disableStyleDropdown('magic');
                this.enableStyleDropdown(item.attackType);
            }

            /**
             * Callback for when a level input is changed
             * @param {Event} event The change event for an input
             * @param {string} skillName The key of playerLevels to Change
             */
            levelInputOnChange(event, skillName) {
                const newLevel = parseInt(event.currentTarget.value);
                if (newLevel >= 1) {
                    this.player.skillLevel[Skills[skillName]] = newLevel;
                    // Update Spell and Prayer Button UIS, and deselect things if they become invalid
                    if (skillName === 'Magic') {
                        this.updateSpellOptions();
                    }
                    if (skillName === 'Prayer') {
                        this.updatePrayerOptions();
                    }
                }
                this.updateCombatStats();
            }

            /**
             * Callback for when a combat style is changed
             * @param {Event} event The change event for a dropdown
             * @param {string} combatType The key of styles to change
             */
            styleDropdownOnChange(event, combatType) {
                let idx = parseInt(event.currentTarget.selectedOptions[0].value);
                if (this.player.attackType === 'ranged') {
                    idx += 3;
                }
                if (this.player.attackType === 'magic') {
                    idx += 6;
                }
                this.player.setAttackStyle(combatType, AttackStyles[idx]);
                this.updateCombatStats();
            }

            // Callback Functions for the Prayer Select Card
            /**
             * Callback for when a prayer image button is clicked
             * @param {MouseEvent} event The onclick event for a button
             * @param {number} prayerID Index of PRAYERS
             */
            prayerButtonOnClick(event, prayerID) {
                // Escape if prayer level is not reached
                const prayer = PRAYER[prayerID];
                if (!this.player.activePrayers.has(prayerID) && this.player.skillLevel[Skills.Prayer] < prayer.prayerLevel) {
                    notifyPlayer(Skills.Prayer, `${this.getPrayerName(prayerID)} requires level ${prayer.prayerLevel} Prayer.`, 'danger');
                    return;
                }
                let prayerChanged = false;
                if (this.player.activePrayers.has(prayerID)) {
                    this.player.activePrayers.delete(prayerID);
                    this.unselectButton(event.currentTarget);
                    prayerChanged = true;
                } else {
                    if (this.player.activePrayers.size < 2) {
                        this.player.activePrayers.add(prayerID);
                        this.selectButton(event.currentTarget);
                        prayerChanged = true;
                    } else {
                        notifyPlayer(Skills.Prayer, 'You can only have 2 prayers active at once.', 'danger');
                    }
                }
                if (prayerChanged) {
                    this.updateCombatStats();
                }
            }

            /**
             * Callback for when the potion tier is changed
             * @param {Event} event The change event for a dropdown
             */
            potionTierDropDownOnChange(event) {
                const potionTier = parseInt(event.currentTarget.selectedOptions[0].value);
                this.player.potionTier = potionTier;
                this.updateCombatStats();
                this.updatePotionTier(potionTier);
            }

            /**
             * Callback for when a potion button is clicked
             * @param {MouseEvent} event The onclick event for a button
             * @param {number} potionID The ID of the potion
             */
            potionImageButtonOnClick(event, potionID) {
                if (this.player.potionSelected) {
                    if (this.player.potionID === potionID) { // Deselect Potion
                        this.player.potionSelected = false;
                        this.player.potionID = -1;
                        this.unselectButton(event.currentTarget);
                    } else { // Change Potion
                        this.unselectButton(document.getElementById(`MCS ${this.getPotionName(this.player.potionID)} Button`));
                        this.player.potionID = potionID;
                        this.selectButton(event.currentTarget);
                    }
                } else { // Select Potion
                    this.player.potionSelected = true;
                    this.player.potionID = potionID;
                    this.selectButton(event.currentTarget);
                }
                this.updateCombatStats();
            }

            // Callback Functions for the spell select buttons
            /**
             * Callback for when a spell is selected
             * @param {MouseEvent} event
             * @param {number} spellID
             * @param {string} spellType
             */
            spellButtonOnClick(event, spellID, spellType) {
                const selectedID = this.player.spellSelection[spellType];
                if (selectedID === spellID) {
                    this.disableSpell(spellType, spellID);
                } else {
                    this.enableSpell(spellType, spellID);
                }
                // Clean up invalid configurations
                this.spellSanityCheck();
                // Update combat stats for new spell
                this.updateCombatStats();
            }

            disableSpell(spellType, spellID, message) {
                // do nothing
                if (spellID === -1 || this.player.spellSelection[spellType] !== spellID) {
                    return;
                }
                // get spell
                const spell = this.combatData.spells[spellType][spellID];
                // unselect spell
                this.unselectButton(document.getElementById(`MCS ${spell.name} Button`));
                this.player.spellSelection[spellType] = -1;
                // send message if required
                if (message) {
                    notifyPlayer(Skills.Magic, message, 'danger');
                }
            }

            enableSpell(spellType, spellID, message) {
                // do nothing
                if (spellID === -1) {
                    return;
                }
                // get spell
                const spell = this.combatData.spells[spellType][spellID];
                // Escape for not meeting the level/item requirement
                if (this.player.skillLevel[Skills.Magic] < spell.level) {
                    notifyPlayer(Skills.Magic, `${spell.name} requires level ${spell.level} Magic.`, 'danger');
                    return;
                }
                if (this.checkRequiredItem(spell)) {
                    notifyPlayer(Skills.Magic, `${spell.name} requires ${this.getItemName(spell.requiredItem)}.`, 'danger');
                    return;
                }
                // remove previous selection
                this.disableSpell(spellType, this.player.spellSelection[spellType]);
                if (spellType === 'ancient') {
                    this.disableSpell('standard', this.player.spellSelection.standard, 'Disabled standard magic spell.');
                }
                if (spellType === 'standard') {
                    this.disableSpell('ancient', this.player.spellSelection.ancient, 'Disabled ancient magick spell.');
                }
                // select spell
                this.selectButton(document.getElementById(`MCS ${spell.name} Button`));
                this.player.spellSelection[spellType] = spellID;
                // send message if required
                if (message) {
                    notifyPlayer(Skills.Magic, message, 'danger');
                }
            }

            spellSanityCheck() {
                const spellSelection = this.player.spellSelection;
                // can we even use magic?
                this.player.checkMagicUsage();
                if (!this.player.canAurora) {
                    this.disableSpell('aurora', spellSelection.aurora, `Disabled aurora, can't use auroras!`);
                }
                if (!this.player.canCurse) {
                    this.disableSpell('curse', spellSelection.curse, `Disabled curse, can't use curses!`);
                }
                if (this.player.attackType !== "magic") {
                    this.disableSpell('ancient', spellSelection.ancient, `Disabled ancient magicks spell, can't use magic!`);
                    this.disableSpell('standard', spellSelection.standard, `Disabled standard magic spell, can't use magic!`);
                    return;
                }
                // get rid of invalid spells selections
                Object.keys(this.combatData.spells).forEach(spellType => {
                    if (spellSelection[spellType] === -1) {
                        return;
                    }
                    if (this.combatData.spells[spellType][spellSelection[spellType]] === undefined) {
                        this.player.spellSelection[spellType] = -1;
                        notifyPlayer(Skills.Magic, `disabled invalid ${spellType} ${spellSelection[spellType]}`, 'danger');
                    }
                });
                // check that at least one spell is selected
                if (spellSelection.standard === -1 && spellSelection.ancient === -1) {
                    this.enableSpell('standard', 0, `Enabled ${this.combatData.spells.standard[0].name}.`);
                }
                // if both standard and ancient magic are selected, disable ancient magic
                if (spellSelection.standard > -1 && spellSelection.ancient > -1) {
                    this.disableSpell('ancient', spellSelection.ancient, `Disabled ${this.combatData.spells.ancient[spellSelection.ancient].name}.`);
                }
                // if ancient magic is selected, disable curses
                if (spellSelection.ancient > -1 && spellSelection.curse > -1) {
                    this.disableSpell('curse', spellSelection.curse, `Disabled ${this.combatData.spells.curse[spellSelection.curse].name}.`);
                }
            }

            // Callback Functions for the pet select card
            /**
             *
             * @param {MouseEvent} event
             * @param {number} petID
             */
            petButtonOnClick(event, petID) {
                if (this.player.petUnlocked[petID]) {
                    this.player.petUnlocked[petID] = false;
                    this.unselectButton(event.currentTarget);
                } else {
                    this.player.petUnlocked[petID] = true;
                    this.selectButton(event.currentTarget);
                }
                this.updateCombatStats();
            }

            // Callback Functions for the Sim Options Card
            /**
             * Callback for when the max actions input is changed
             * @param {Event} event The change event for an input
             */
            maxActionsInputOnChange(event) {
                const newMaxActions = parseInt(event.currentTarget.value);
                if (newMaxActions > 0) {
                    MICSR.maxActions = newMaxActions;
                }
            }

            /**
             * Callback for when the number of trials input is changed
             * @param {Event} event The change event for an input
             */
            numTrialsInputOnChange(event) {
                const newNumTrials = parseInt(event.currentTarget.value);
                if (newNumTrials > 0) {
                    MICSR.trials = newNumTrials;
                }
            }

            /**
             * Callback for when the number of ticks input is changed
             * @param {Event} event The change event for an input
             */
            maxTicksInputOnChange(event) {
                const maxTicks = parseInt(event.currentTarget.value);
                if (maxTicks > 0) {
                    MICSR.maxTicks = maxTicks;
                }
            }

            /**
             * Callback for when the alchemyCutoff input is changed
             * @param {Event} event The change event for an input
             */
            alchemyCutoffInputOnChange(event) {
                const alchemyCutoff = parseInt(event.currentTarget.value);
                this.loot.alchemyCutoff = alchemyCutoff;
                this.updatePlotForGP();
            }

            /**
             * Callback for when the plot type is changed
             * @param {Event} event The change event for a dropdown
             */
            plottypeDropdownOnChange(event) {
                this.plotter.plotType = event.currentTarget.value;
                this.plotter.plotID = event.currentTarget.selectedIndex;
                this.simulator.selectedPlotIsTime = this.plotTypes[event.currentTarget.selectedIndex].isTime;
                this.simulator.selectedPlotScales = this.plotTypes[event.currentTarget.selectedIndex].scale;
                if (this.simulator.selectedPlotIsTime) {
                    this.plotter.timeDropdown.style.display = '';
                } else {
                    this.plotter.timeDropdown.style.display = 'none';
                }
                if (this.plotter.plotType === 'petChance') {
                    this.plotter.petSkillDropdown.style.display = '';
                } else {
                    this.plotter.petSkillDropdown.style.display = 'none';
                }
                this.updatePlotData();
            }

            /**
             * Callback for when the pet skill type is changed
             * @param {Event} event The change event for a dropdown
             */
            petSkillDropdownOnChange(event) {
                this.loot.petSkill = event.currentTarget.value;
                this.loot.updatePetChance();
                if (this.plotter.plotType === 'petChance') {
                    this.updatePlotData();
                }
                document.getElementById(`MCS  Pet (%)/${this.timeShorthand[this.initialTimeUnitIndex]} Label`).textContent = this.loot.petSkill + ' Pet (%)/' + this.selectedTimeShorthand;
                this.updateZoneInfoCard();
            }

            /**
             * Callback for when the simulate button is clicked
             * @param {boolean} single
             */
            simulateButtonOnClick(single) {
                if (this.simulator.simInProgress) {
                    this.simulator.cancelSimulation();
                    const simButton = document.getElementById('MCS Simulate All Button');
                    simButton.disabled = true;
                    simButton.textContent = 'Cancelling...';
                }
                if (!this.simulator.simInProgress && this.simulator.simulationWorkers.length === this.simulator.maxThreads) {
                    document.getElementById('MCS Simulate Selected Button').style.display = 'none';
                    this.simulator.simulateCombat(single);
                }
            }

            blockingSimulateButtonOnClick() {
                const startTimeStamp = performance.now();
                // queue the desired monsters
                this.simulator.setupCurrentSim(true);
                const ids = this.simulator.currentSim.ids;
                this.simulator.simulationQueue.forEach(queueItem => {
                    const simResult = this.manager.runTrials(queueItem.monsterID, ids.dungeonID, MICSR.trials, MICSR.maxTicks, true);
                    const simID = this.simulator.simID(queueItem.monsterID, ids.dungeonID);
                    this.simulator.monsterSimData[simID] = this.manager.convertSlowSimToResult(simResult, MICSR.trials);
                });
                this.simulator.performPostSimAnalysis(true);
                this.updateDisplayPostSim();
                const processingTime = performance.now() - startTimeStamp;
                MICSR.log(`Simulation took ${processingTime / 1000}s.`);
            }

            exportSettingButtonOnClick() {
                const settings = this.import.exportSettings();
                const data = JSON.stringify(settings, null, 1);
                this.popExport(data);
            }

            /**
             * Callback for when the sell bones option is changed
             * @param {Event} event The change event for a radio
             * @param {boolean} newState The new value for the option
             */
            sellBonesRadioOnChange(event, newState) {
                this.loot.sellBones = newState;
                this.updatePlotForGP();
            }

            /**
             * Callback for when the convert shards option is changed
             * @param {Event} event The change event for a radio
             * @param {boolean} newState The new value for the option
             */
            convertShardsRadioOnChange(event, newState) {
                this.loot.convertShards = newState;
                this.updatePlotForGP();
            }

            /**
             * Callback for when the alchHighValueItems option is changed
             * @param {Event} event The change event for a radio
             * @param {boolean} newState The new value for the option
             */
            alchHighValueItemsRadioOnChange(event, newState) {
                this.loot.alchHighValueItems = newState;
                this.updatePlotForGP();
            }

            /**
             * Callback for when the slayer task option is changed
             * @param {Event} event The change event for a radio
             * @param {boolean} newState The new value for the option
             */
            slayerTaskRadioOnChange(event, newState) {
                this.player.isSlayerTask = newState;
                this.slayerTaskSimsToggle();
            }

            slayerTaskSimsToggle() {
                // toggle dungeon sims off if slayer task is on
                if (this.player.isSlayerTask) {
                    this.toggleDungeonSims(false, true);
                }
                // toggle auto slayer sims off if slayer task is off
                if (!this.player.isSlayerTask) {
                    this.toggleSlayerSims(false, true);
                }
            }

            /**
             * The callback for when the time unit dropdown is changed
             * @param {Event} event The change event for a dropdown
             */
            timeUnitDropdownOnChange(event) {
                this.timeMultiplier = this.timeMultipliers[event.currentTarget.selectedIndex];
                this.simulator.selectedPlotIsTime = this.plotTypes[this.plotter.plotID].isTime;
                this.simulator.selectedPlotScales = this.plotTypes[this.plotter.plotID].scale;
                this.selectedTime = this.timeOptions[event.currentTarget.selectedIndex];
                this.selectedTimeShorthand = this.timeShorthand[event.currentTarget.selectedIndex];
                // Updated Signet chance
                this.loot.updateSignetChance();
                // Update pet chance
                this.loot.updatePetChance();
                // Update zone info card time units
                for (let i = 0; i < this.plotTypes.length; i++) {
                    const name = this.plotTypes[i].info;
                    const value = this.plotTypes[i].value;
                    let newName = '';
                    if (value === 'petChance') {
                        newName = this.loot.petSkill + name + this.selectedTimeShorthand;
                    } else if (value === 'dropChance') {
                        newName = this.getSelectedDropLabel();
                    } else if (this.plotTypes[i].isTime) {
                        newName = name + this.selectedTimeShorthand;
                    }
                    if (newName) {
                        document.getElementById(`MCS ${name}h Label`).textContent = newName;
                    }
                }
                // Update Plot
                this.updatePlotData();
                // Update Info Card
                this.updateZoneInfoCard();
            }

            notify(message, type = 'success') {
                let img = this.media.combat;
                Toastify({
                    text: `<div class=text-center><img class="notification-img" src="${img}"><span class="badge badge-${type}">${message}</span></div>`,
                    duration: 2000,
                    gravity: 'bottom',
                    position: 'center',
                    backgroundColor: 'transparent',
                    stopOnFocus: false,
                }).showToast();
            }

            popExport(data) {
                navigator.clipboard.writeText(data).then(() => {
                    this.notify('Exported to clipboard!');
                }, () => {
                    Swal.fire({
                        title: 'Clipboard API error!',
                        html: `<h5 class="font-w600 text-combat-smoke mb-1">Manually copy the data below, e.g. with ctrl-A ctrl-C.</h5><textarea class="mcsLabel mb-1">${data}</textarea>`,
                        showCancelButton: false,
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'Bye',
                    });
                });
            }

            /**
             * The callback for when the export button is clicked
             */
            exportDataOnClick() {
                let data = this.dataExport.exportData();
                this.popExport(data);
            }

            barIsMonster(idx) {
                return this.barType[idx] === this.barTypes.monster;
            }

            barIsDungeon(idx) {
                return this.barType[idx] === this.barTypes.dungeon;
            }

            barIsTask(idx) {
                return this.barType[idx] === this.barTypes.task;
            }

            // Callback Functions for Bar inspection
            /**
             * The callback for when the inspect dungeon button is clicked
             */
            inspectDungeonOnClick() {
                if (this.barSelected && !this.barIsMonster(this.selectedBar)) {
                    this.setPlotToDungeon(this.barMonsterIDs[this.selectedBar]);
                } else {
                    MICSR.warn('How did you click this?');
                }
            }

            /**
             * The callback for when the stop dungeon inspection button is clicked
             */
            stopInspectOnClick() {
                this.setPlotToGeneral();
            }

            /**
             * The callback for when a plotter bar is clicked
             * @param {number} barID The id of the bar
             */
            barOnClick(barID) {
                if (this.barSelected) {
                    if (this.selectedBar === barID) {
                        this.barSelected = false;
                        this.removeBarhighlight(barID);
                    } else {
                        this.removeBarhighlight(this.selectedBar);
                        this.selectedBar = barID;
                        this.setBarHighlight(barID);
                    }
                } else {
                    this.barSelected = true;
                    this.selectedBar = barID;
                    this.setBarHighlight(barID);
                }
                if (this.barSelected && !this.isViewingDungeon && !this.barIsMonster(barID)) {
                    this.plotter.inspectButton.style.display = '';
                } else {
                    this.plotter.inspectButton.style.display = 'none';
                }
                this.updateZoneInfoCard();
                this.createLootOptionsCard();
            }

            /**
             * Turns on the border for a bar
             * @param {number} barID The id of the bar
             */
            setBarHighlight(barID) {
                if (this.plotter.bars[barID].className === 'mcsBar') {
                    this.plotter.bars[barID].style.border = 'thin solid red';
                } else {
                    this.plotter.bars[barID].style.border = 'thin solid blue';
                }
            }

            /**
             * Turns off the border for a bar
             * @param {number} barID The id of the bar
             */
            removeBarhighlight(barID) {
                this.plotter.bars[barID].style.border = 'none';
            }

            /**
             * Callback for when a monster/dungeon image below a bar is clicked
             * @param {number} imageID The id of the image that was clicked
             */
            barImageOnClick(imageID) {
                if (this.isViewingDungeon) {
                    return;
                }
                let newState;
                if (this.barIsDungeon(imageID)) {
                    newState = !this.simulator.dungeonSimFilter[this.barMonsterIDs[imageID]];
                    if (newState && this.player.isSlayerTask) {
                        this.notify('no dungeon simulation on slayer task', 'danger');
                        newState = false;
                    }
                    this.simulator.dungeonSimFilter[this.barMonsterIDs[imageID]] = newState;
                } else if (this.barIsTask(imageID)) {
                    const taskID = this.barMonsterIDs[imageID] - MICSR.dungeons.length;
                    newState = !this.simulator.slayerSimFilter[taskID];
                    if (newState && !this.player.isSlayerTask) {
                        this.notify('no auto slayer simulation off slayer task', 'danger');
                        newState = false;
                    }
                    this.simulator.slayerSimFilter[taskID] = newState;
                } else {
                    this.simulator.monsterSimFilter[this.barMonsterIDs[imageID]] = !this.simulator.monsterSimFilter[this.barMonsterIDs[imageID]];
                    newState = this.simulator.monsterSimFilter[this.barMonsterIDs[imageID]];
                }
                // UI Changes
                if (newState) {
                    // Uncross
                    this.plotter.unCrossOutBarImage(imageID);
                } else {
                    // Crossout
                    this.plotter.crossOutBarImage(imageID);
                    if (this.selectedBar === imageID) {
                        this.barSelected = false;
                        this.removeBarhighlight(imageID);
                    }
                }
                this.updatePlotData();
            }

            /**
             * Callback to toggle the simulation of dungeons
             */
            toggleDungeonSims(newState, silent) {
                if (newState && this.player.isSlayerTask) {
                    if (!silent) {
                        this.notify('no dungeon simulation on slayer task', 'danger')
                    }
                    newState = false;
                }
                this.dungeonToggleState = newState;
                for (let i = 0; i < MICSR.dungeons.length; i++) {
                    this.simulator.dungeonSimFilter[i] = newState;
                }
                this.updatePlotData();
                this.plotter.crossImagesPerSetting();
            }

            /**
             * Callback to toggle the simulation of dungeons
             */
            toggleSlayerSims(newState, silent) {
                if (newState && !this.player.isSlayerTask) {
                    if (!silent) {
                        this.notify('no auto slayer simulation off slayer task', 'danger');
                    }
                    newState = false;
                }
                this.slayerToggleState = newState;
                for (let i = 0; i < SlayerTask.data.length; i++) {
                    this.simulator.slayerSimFilter[i] = newState;
                }
                this.updatePlotData();
                this.plotter.crossImagesPerSetting();
            }

            /**
             * Callback to toggle the simulation of monsters in combat and slayer areas
             */
            toggleMonsterSims() {
                const newState = !this.monsterToggleState;
                this.monsterToggleState = newState;
                // Set all non-dungeon monsters to newState
                this.monsterIDs.forEach((monsterID) => {
                    this.simulator.monsterSimFilter[monsterID] = newState;
                });
                this.updatePlotData();
                this.plotter.crossImagesPerSetting();
            }

            /**
             * Updates the bars in the plot to the currently selected plot type
             */
            updatePlotData() {
                this.plotter.updateBarData(this.simulator.getDataSet(this.plotter.plotType), this.simulator.getRawData());
            }

            getSimFailureText(data) {
                const prefix = 'No valid simulation data';
                if (data.reason) {
                    if (data.tickCount >= MICSR.maxTicks * MICSR.trials) {
                        return `Insufficient simulation time: ${data.reason}.`
                    }
                    return `${prefix}: ${data.reason}.`;
                }
                if (!data.simSuccess) {
                    return `${prefix}: unknown simulation error.`;
                }
                return '';
            }

            setZoneInfoCard(title, id, media, data) {
                document.getElementById('MCS Zone Info Title').textContent = `${title} (id ${id})`;
                document.getElementById('MCS Info Image').src = media;
                this.failureLabel.textContent = this.getSimFailureText(data);
                const updateInfo = data.simSuccess;
                for (let i = 0; i < this.plotTypes.length; i++) {
                    const dataKey = this.plotTypes[i].value;
                    const outElem = document.getElementById(`MCS ${dataKey} Output`);
                    outElem.textContent = updateInfo && !isNaN(data[dataKey])
                        ? MICSR.mcsFormatNum(this.simulator.getValue(true, data, dataKey, this.plotTypes[i].scale), 4)
                        : 'N/A';
                }
                if (data.highestDamageTaken >= data.lowestHitpoints) {
                    document.getElementById('MCS highestDamageTaken Output').style.color = 'orange';
                    document.getElementById('MCS lowestHitpoints Output').style.color = 'orange';
                } else {
                    document.getElementById('MCS highestDamageTaken Output').style.color = '';
                    document.getElementById('MCS lowestHitpoints Output').style.color = '';
                }
                if (data.deathRate > 0) {
                    document.getElementById('MCS deathRate Output').style.color = 'red';
                } else {
                    document.getElementById('MCS deathRate Output').style.color = '';
                }
                this.setDeathRateTooltip(data.deathRate, data.killTimeS);
                this.setGPTooltip(data.baseGpPerSecond, data.killTimeS);
                this.setRuneTooltip(data.usedRunesBreakdown, data.killTimeS);
                this.setPrayerTooltip(data.prayerXpPerSecond, data.ppConsumedPerSecond);
            }

            setDeathRateTooltip(deathRate, killTimeS) {
                let dataMultiplier = this.timeMultiplier;
                if (dataMultiplier === -1) {
                    dataMultiplier = killTimeS;
                }
                let tooltip = `<span>${Math.floor(deathRate / killTimeS * dataMultiplier * 10000) / 10000} Est. Deaths/${this.selectedTimeShorthand}</span><br/>`;
                tooltip = `<div className="text-center">${tooltip}</div>`;
                document.getElementById(`MCS deathRate Output`)._tippy.setContent(tooltip);
            }

            setGPTooltip(baseGpPerSecond, killTimeS) {
                let dataMultiplier = this.timeMultiplier;
                if (dataMultiplier === -1) {
                    dataMultiplier = killTimeS;
                }
                let tooltip = `<span>${formatNumber(Math.floor(baseGpPerSecond * dataMultiplier))} Raw GP/${this.selectedTimeShorthand}</span><br/>`;
                tooltip = `<div className="text-center">${tooltip}</div>`;
                document.getElementById(`MCS gpPerSecond Output`)._tippy.setContent(tooltip);
            }

            setPrayerTooltip(prayerXpPerSecond, ppConsumedPerSecond) {
                let xpPerPP = prayerXpPerSecond / ppConsumedPerSecond;
                if (prayerXpPerSecond === 0) {
                    xpPerPP = 0;
                }
                let tooltip = `<span>${(xpPerPP).toFixed(3)} Prayer XP/Point</span><br/>`;
                tooltip = `<div className="text-center">${tooltip}</div>`;
                document.getElementById(`MCS prayerXpPerSecond Output`)._tippy.setContent(tooltip);
            }

            setRuneTooltip(runesUsed, killTimeS) {
                let dataMultiplier = this.timeMultiplier;
                if (dataMultiplier === -1) {
                    dataMultiplier = killTimeS;
                }
                let tooltip = '';
                for (const id in runesUsed) {
                    tooltip += `<img class="skill-icon-xs" src="${getItemMedia(id)}"><span>${(runesUsed[id] * dataMultiplier).toFixed(2)}</span><br/>`
                }
                if (tooltip.length > 0) {
                    tooltip = `<div className="text-center">Runes / ${this.selectedTime}<br/>${tooltip}</div>`
                    document.getElementById(`MCS runesUsedPerSecond Output`)._tippy.setContent(tooltip);
                } else {
                    document.getElementById(`MCS runesUsedPerSecond Output`)._tippy.setContent(`No runes used.`);
                }
            }

            /**
             * Updates the zone info card text fields
             */
            updateZoneInfoCard() {
                if (this.barSelected) {
                    this.subInfoCard.container.style.display = '';
                    this.infoPlaceholder.style.display = 'none';
                    if (!this.isViewingDungeon && this.barIsDungeon(this.selectedBar)) {
                        const dungeonID = this.barMonsterIDs[this.selectedBar];
                        this.setZoneInfoCard(
                            this.getDungeonName(dungeonID),
                            dungeonID,
                            MICSR.dungeons[dungeonID].media,
                            this.simulator.dungeonSimData[dungeonID],
                        );
                    } else if (!this.isViewingDungeon && this.barIsTask(this.selectedBar)) {
                        const taskID = this.barMonsterIDs[this.selectedBar] - MICSR.dungeons.length;
                        this.setZoneInfoCard(
                            SlayerTask.data[taskID].display,
                            taskID,
                            SKILLS[Skills.Slayer].media,
                            this.simulator.slayerSimData[taskID],
                        );
                    } else {
                        let monsterID;
                        let dungeonID;
                        if (this.isViewingDungeon) {
                            dungeonID = this.viewedDungeonID;
                            monsterID = this.getSelectedDungeonMonsterID();
                        } else {
                            monsterID = this.barMonsterIDs[this.selectedBar];
                        }
                        this.setZoneInfoCard(
                            this.getMonsterName(monsterID),
                            monsterID,
                            MONSTERS[monsterID].media,
                            this.simulator.monsterSimData[this.simulator.simID(
                                monsterID,
                                dungeonID >= MICSR.dungeons.length ? undefined : dungeonID,
                            )],
                        );
                    }
                } else {
                    document.getElementById('MCS Zone Info Title').textContent = 'Monster/Dungeon Info.';
                    this.subInfoCard.container.style.display = 'none';
                    this.infoPlaceholder.style.display = '';
                }
            }

            getSelectedDungeonMonsterID() {
                const selection = this.getMonsterList(this.viewedDungeonID);
                return selection[this.selectedBar + selection.length - this.plotter.bars.length];
            }

            /**
             * get list of monsters for dungeon (or slayer task, where task IDs start at MICSR.dungeons.length)
             */
            getMonsterList(dungeonID) {
                if (dungeonID < MICSR.dungeons.length) {
                    return MICSR.dungeons[this.viewedDungeonID].monsters;
                }
                const taskID = dungeonID - MICSR.dungeons.length;
                return this.simulator.slayerTaskMonsters[taskID];
            }

            // Functions that manipulate the UI
            /**
             * Toggles the display of a style dropdown, and the spell selection dropdown off
             * @param {string} combatType The combat type to disable
             */
            disableStyleDropdown(combatType) {
                document.getElementById(`MCS ${combatType} Style Dropdown`).style.display = 'none';
            }

            /**
             * Toggles the display of a style dropdown, and the spell selection dropdown on
             * @param {string} combatType The combat type to enable
             */
            enableStyleDropdown(combatType) {
                document.getElementById(`MCS ${combatType} Style Dropdown`).style.display = 'inline';
            }

            /**
             * Updates the list of options in the spell menus, based on if the player can use it
             */
            updateSpellOptions() {
                this.player.computeAttackType();
                this.player.checkMagicUsage();
                this.checkForSpellLevel();
                this.checkForSpellItem();
                this.spellSanityCheck();
            }

            /**
             * Checks if magic level required for spell is met
             */
            checkForSpellLevel() {
                const magicLevel = this.player.skillLevel[Skills.Magic];
                const setSpellsPerLevel = (spell, spellID, spellType) => {
                    if (magicLevel < spell.level) {
                        document.getElementById(`MCS ${spell.name} Button Image`).src = this.media.question;
                        this.disableSpell(spellType, spellID, `${spell.name} has been de-selected. It requires level ${spell.level} Magic.`);
                    } else {
                        document.getElementById(`MCS ${spell.name} Button Image`).src = spell.media;
                    }
                };
                SPELLS.forEach((spell, index) => setSpellsPerLevel(spell, index, 'standard'));
                AURORAS.forEach((spell, index) => setSpellsPerLevel(spell, index, 'aurora'));
                CURSES.forEach((spell, index) => setSpellsPerLevel(spell, index, 'curse'));
                ANCIENT.forEach((spell, index) => setSpellsPerLevel(spell, index, 'ancient'));
            }

            checkRequiredItem(spell) {
                return spell.requiredItem !== undefined && spell.requiredItem !== -1 && !this.player.equipmentIDs().includes(spell.requiredItem);
            }

            /**
             * Checks if item required for spell is equipped
             */
            checkForSpellItem() {
                const disableSpellsForItem = (spell, spellID, spellType) => {
                    if (this.checkRequiredItem(spell)) {
                        document.getElementById(`MCS ${spell.name} Button Image`).src = this.media.question;
                        this.disableSpell(spellType, spellID, `${spell.name} has been de-selected. It requires ${this.getItemName(spell.requiredItem)}.`);
                    }
                };
                SPELLS.forEach((spell, index) => disableSpellsForItem(spell, index, 'standard'));
                AURORAS.forEach((spell, index) => disableSpellsForItem(spell, index, 'aurora'));
                CURSES.forEach((spell, index) => disableSpellsForItem(spell, index, 'curse'));
                ANCIENT.forEach((spell, index) => disableSpellsForItem(spell, index, 'ancient'));
            }

            /**
             * Updates the prayers that display in the prayer selection card, based on if the player can use it
             */
            updatePrayerOptions() {
                const prayerLevel = this.player.skillLevel[Skills.Prayer];
                PRAYER.forEach(prayer => {
                    const prayerName = this.getPrayerName(prayer.id);
                    if (prayer.prayerLevel > prayerLevel) {
                        document.getElementById(`MCS ${prayerName} Button Image`).src = this.media.question;
                        if (this.player.activePrayers.has(prayer.id)) {
                            this.prayerButtonOnClick({currentTarget: document.getElementById(`MCS ${prayerName} Button`)}, prayer.id);
                            notifyPlayer(Skills.Prayer, `${prayerName} has been de-selected. It requires level ${prayer.prayerLevel} Prayer.`, 'danger');
                        }
                    } else {
                        document.getElementById(`MCS ${prayerName} Button Image`).src = prayer.media;
                    }
                });
            }

            /**
             * Updates the text fields for the computed combat stats
             */
            updateCombatStats() {
                // first update the values
                this.combatData.updateCombatStats();
                // second update the view
                this.combatStatKeys.forEach((key) => {
                    if (key === 'attackSpeed') {
                        const attackSpeed = this.combatData.playerAttackSpeed();
                        document.getElementById(`MCS ${key} CS Output`).textContent = attackSpeed.toLocaleString();
                    } else {
                        document.getElementById(`MCS ${key} CS Output`).textContent = this.combatData.combatStats[key].toLocaleString();
                    }
                });
                this.setSummoningSynergyText();
                this.consumables.updateView();
            }

            /**
             * Updates the simulator display for when a gp option is changed
             */
            updatePlotForGP() {
                this.loot.updateGPData();
                if (this.plotter.plotType === 'gpPerSecond') {
                    this.updatePlotData();
                }
                this.updateZoneInfoCard();
            }

            /**
             * Updates the simulator display for when a loot option is changed
             */
            updatePlotForLoot() {
                document.getElementById('MCS Drops/h Label').textContent = this.getSelectedDropLabel();
                this.loot.updateDropChance();
                this.consumables.update();
                if (this.plotter.plotType === 'dropChance') {
                    this.updatePlotData();
                }
                this.updateZoneInfoCard();
            }

            /**
             * Updates the images and tooltips for potions when the potion tier is changed
             * @param {number} potionTier The new potion tier
             */
            updatePotionTier(potionTier) {
                this.combatPotionIDs.forEach((potionId) => {
                    const potion = items[Herblore.potions[potionId].potionIDs[potionTier]];
                    const img = document.getElementById(`MCS ${this.getPotionName(potionId)} Button Image`);
                    img.src = getItemMedia(potion.id);
                    img.parentElement._tippy.setContent(this.getPotionTooltip(potion));
                });
            }

            /**
             * Gets the content for the tooltip of a potion
             * @param potion The potion object to get the tooltip for
             * @returns {string} The tooltip content
             */
            getPotionTooltip(potion) {
                return `<div class="text-center">${potion.name}<small>`
                    + `<br><span class='text-info'>${potion.description.replace(/\.$/, '')}</span>`
                    + `<br><span class='text-warning'>${potion.potionCharges} Potion Charges</span>`
                    + `</small></div>`;
            }

            // Functions for dungeon display
            /**
             * Changes the simulator to display an individual dungeon
             * @param {number} dungeonID the index of the dungeon in MICSR.dungeons
             */
            setPlotToDungeon(dungeonID) {
                this.isViewingDungeon = true;
                this.viewedDungeonID = dungeonID;
                this.loot.update();
                this.updatePlotData();
                // Undo bar selection if needed
                if (this.barSelected) {
                    this.barSelected = false;
                    this.removeBarhighlight(this.selectedBar);
                }
                this.updateZoneInfoCard();
                this.plotter.displayDungeon(dungeonID);
            }

            /**
             * Changes the simulator to display non-dungeon monsters and dungeon summary results
             */
            setPlotToGeneral() {
                this.isViewingDungeon = false;
                this.loot.update();
                if (this.barSelected) {
                    this.removeBarhighlight(this.selectedBar);
                }
                this.barSelected = true;
                const barID = this.dungeonBarIDs[this.viewedDungeonID];
                this.selectedBar = barID;
                this.setBarHighlight(barID);
                this.plotter.inspectButton.style.display = '';
                this.updatePlotData();
                this.updateZoneInfoCard();
                this.plotter.displayGeneral();
            }

            // Data Sanitizing Functions
            /**
             * Removes HTML from the dungeon name
             * @param {number} dungeonID The index of Dungeons
             * @return {string} The name of a dungeon
             */
            getDungeonName(dungeonID) {
                return this.replaceApostrophe(MICSR.dungeons[dungeonID].name);
            }

            /**
             * Removes HTML from the potion name
             * @param {number} potionID The index of Herblore.potions
             * @return {string} The name of a potion
             */
            getPotionName(potionID) {
                return this.replaceApostrophe(Herblore.potions[potionID].name);
            }

            /**
             * Removes HTML from a prayer name
             * @param {number} prayerID The index of PRAYER
             * @return {string} the name of a prayer
             */
            getPrayerName(prayerID) {
                return this.replaceApostrophe(PRAYER[prayerID].name);
            }

            /**
             * Removes HTML from an item name
             * @param {number} itemID The index of items
             * @return {string} The name of an item
             */
            getItemName(itemID) {
                if (itemID === -1) {
                    return 'None';
                } else if (!items[itemID]) {
                    MICSR.warn(`Invalid itemID ${itemID} in getItemName`);
                    return 'None';
                } else {
                    return this.replaceApostrophe(items[itemID].name);
                }
            }

            getItemMedia(item) {
                if (item.id === -1) {
                    return item.media;
                }
                return getItemMedia(item.id);
            }

            /**
             * Removes HTML from a monster name
             * @param {number} monsterID The index of MONSTERS
             * @return {string} the name of a monster
             */
            getMonsterName(monsterID) {
                return this.replaceApostrophe(MONSTERS[monsterID].name);
            }

            /**
             * Replaces &apos; with an actual ' character
             * @param {string} stringToFix The string to replace
             * @return {string} the fixed string
             */
            replaceApostrophe(stringToFix) {
                return stringToFix.replace(/&apos;/g, '\'');
            }

            /** Updates the display post simulation */
            updateDisplayPostSim() {
                this.createLootOptionsCard(); // update in case slayer task monsters changed
                this.updatePlotData();
                this.updateZoneInfoCard();
                if (this.isViewingDungeon) {
                    this.setPlotToGeneral();
                    this.setPlotToDungeon(this.barMonsterIDs[this.selectedBar]);
                }
                document.getElementById('MCS Simulate All Button').disabled = false;
                document.getElementById('MCS Simulate All Button').textContent = 'Simulate All';
                document.getElementById('MCS Simulate Selected Button').style.display = 'block';
            }

            destroy() {
                // terminate any workers
                this.simulator.simulationWorkers.forEach((worker) => worker.worker.terminate());
                // remove all tool tips
                this.tippySingleton.destroy();
                this.tippyInstances.forEach(instance => instance.destroy());
                this.tippyNoSingletonInstances.forEach(instance => instance.destroy());
                // remove the interface
                MICSR.destroyMenu(this.menuItemId, this.modalID);
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
    waitLoadOrder(reqs, setup, 'App');

})();