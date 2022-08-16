/*  Melvor Idle Combat Simulator

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
        'modifierNames',
        'Card',
    ];

    const setup = () => {
        const MICSR = window.MICSR;

        /**
         * Class for the cards in the bottom of the ui
         */
        MICSR.AgilityCourse = class {
            constructor(parent, data, filters) {
                this.parent = parent;
                this.data = data;
                this.filters = filters;
                this.filter = this.filters[0];
                this.id = Date.now();
                this.tmpModifiers = new PlayerModifiers();

                // icons
                this.media = {
                    combat: 'assets/media/skills/combat/combat.svg',
                    gp: 'assets/media/main/coins.svg',
                    mastery: 'assets/media/main/mastery_header.svg',
                    stamina: 'assets/media/main/stamina.svg',
                    statistics: 'assets/media/main/statistics_header.svg',
                };

                // copy obstacles
                this.agilityCategories = 10;
                const noObstacle = {
                    category: -1,
                    id: -1,
                    cost: {},
                    description: '',
                    media: this.media.stamina,
                    modifiers: {},
                    name: 'None',
                    requirements: {},
                }
                this.agilityObstacles = [noObstacle, ...Agility.obstacles.map((x, id) => {
                    const obstacle = {...x};
                    obstacle.id = id;
                    this.filters.forEach(filter => obstacle[filter.tag] = MICSR.showModifiersInstance.printRelevantModifiers(x.modifiers, filter.tag).length > 0);
                    return obstacle;
                })];
                this.agilityPillars = [noObstacle, ...Agility.passivePillars.map((x, id) => {
                    const pillar = {...x};
                    pillar.id = id;
                    pillar.media = [this.media.combat, this.media.statistics, this.media.gp][id]
                    this.filters.forEach(filter => pillar[filter.tag] = MICSR.showModifiersInstance.printRelevantModifiers(x.modifiers, filter.tag).length > 0);
                    return pillar;
                })];
            }

            createAgilityCourseContainer(card, filter) {
                this.filter = filter;
                card.addSectionTitle('Agility Course');

                let i = 0;
                for (; i <= this.agilityCategories; i++) {
                    const category = i;
                    const obstacleSelectionContainer = card.createCCContainer();
                    // mastery button
                    if (category < this.agilityCategories) {
                        const masteryButton = card.createImageButton(this.media.mastery, `Agility Mastery ${category} ${this.id} Toggle`, (event) => this.agilityMasteryOnClick(event, category), 'Small', '99 Mastery');
                        masteryButton.className += ' col-3';
                        obstacleSelectionContainer.appendChild(masteryButton);
                    } else {
                        const emptyDiv = document.createElement('div');
                        emptyDiv.className += ' col-3';
                        obstacleSelectionContainer.appendChild(emptyDiv);
                    }
                    // popup
                    card.addMultiPopupMenu(
                        [this.media.stamina],
                        [`MICSR Obstacle ${category} ${this.id} Image`],
                        [this.createAgilityPopup(category, filter)],
                        ['None'],
                        obstacleSelectionContainer,
                    );
                    obstacleSelectionContainer.lastChild.className += ' col-3';
                    // label
                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'col-6';
                    labelDiv.style = 'display: table; text-align: center;';
                    const label = document.createElement('label');
                    label.id = `MICSR Obstacle ${category} ${this.id} Label`;
                    label.textContent = 'None';
                    label.style = 'display: table-cell; vertical-align: middle;';
                    labelDiv.appendChild(label);
                    obstacleSelectionContainer.appendChild(labelDiv);
                    // add selection container to card
                    card.container.appendChild(obstacleSelectionContainer);
                }
            }

            /** Adds a multi-button with agility obstacle to the agility obstacle select popup
             * @param {Card} card The parent card
             * @param {number} category The obstacle index
             */
            addObstacleMultiButton(card, title, category, prop, isProp) {
                const menuItems = category === this.agilityCategories
                    ? this.agilityPillars
                    : this.agilityObstacles.filter(x => x.category === -1 || (x[prop] === isProp && x.category === category));
                if (menuItems.length <= 1) {
                    return;
                }
                const buttonMedia = menuItems.map(obstacle => obstacle.media);
                const buttonIds = menuItems.map(obstacle => `${obstacle.name} ${this.id}`);
                const buttonCallbacks = menuItems.map(obstacle => () => this.selectObstacle(category, obstacle));
                const tooltips = menuItems.map(obstacle => this.getObstacleTooltip(category, obstacle));
                card.addSectionTitle(title);
                card.addImageButtons(buttonMedia, buttonIds, 'Small', buttonCallbacks, tooltips, '100%');
            }

            getObstacleTooltip(category, obstacle) {
                let passives = `<div class="text-center">${obstacle.name}</div>`;
                if (this.data.courseMastery[category]) {
                    this.tmpModifiers.addModifiers(obstacle.modifiers, 0.5);
                } else {
                    this.tmpModifiers.addModifiers(obstacle.modifiers);
                }
                MICSR.showModifiersInstance.printRelevantModifiers(this.tmpModifiers, this.filter.tag).forEach(toPrint => {
                    passives += `<div class="${toPrint[1]}">${toPrint[0]}</div>`;
                });
                this.tmpModifiers.reset();
                return passives;
            }

            createAgilityPopup(category, filter) {
                const obstacleSelectPopup = document.createElement('div');
                obstacleSelectPopup.className = 'mcsPopup';
                obstacleSelectPopup.style = 'width:350px;';
                const obstacleSelectCard = new MICSR.Card(obstacleSelectPopup, '', '600px');
                if (category === this.agilityCategories) {
                    this.addObstacleMultiButton(obstacleSelectCard, 'Pillars', category, filter.tag, true);
                } else {
                    this.addObstacleMultiButton(obstacleSelectCard, `${filter.text} Obstacles`, category, filter.tag, true);
                    this.addObstacleMultiButton(obstacleSelectCard, 'Other Obstacles', category, filter.tag, false);
                }
                return obstacleSelectPopup;
            }

            selectObstacle(category, obstacle) {
                const label = document.getElementById(`MICSR Obstacle ${category} ${this.id} Label`);
                label.textContent = obstacle.name;
                this.setObstacleImage(category, obstacle);
                if (category === this.agilityCategories) {
                    this.data.pillar = obstacle.id;
                } else {
                    if (obstacle.category === -1) {
                        this.data.course[category] = -1;
                    } else {
                        this.data.course[category] = obstacle.id;
                    }
                }
                this.parent.agilityCourseCallback();
            }

            /**
             * Change the obstacle image
             */
            setObstacleImage(category, obstacle) {
                const img = document.getElementById(`MICSR Obstacle ${category} ${this.id} Image`);
                img.src = obstacle.media;
                img._tippy.setContent(this.getObstacleTooltip(category, obstacle));
            }

            updateAgilityTooltips(category) {
                this.agilityObstacles.forEach(obstacle => {
                    if (obstacle.category !== category) {
                        return;
                    }
                    const button = document.getElementById(`MCS ${obstacle.name} ${this.id} Button`);
                    button._tippy.setContent(this.getObstacleTooltip(category, obstacle));
                });
                const obstacle = this.agilityObstacles[this.data.course[category] + 1];
                const img = document.getElementById(`MICSR Obstacle ${category} ${this.id} Image`);
                img._tippy.setContent(this.getObstacleTooltip(category, obstacle));
            }

            agilityMasteryOnClick(event, category) {
                // toggle
                if (this.data.courseMastery[category]) {
                    this.data.courseMastery[category] = false;
                    this.parent.unselectButton(event.currentTarget);
                } else {
                    this.data.courseMastery[category] = true;
                    this.parent.selectButton(event.currentTarget);
                }
                // update tool tips
                this.updateAgilityTooltips(category);
                // callback
                this.parent.agilityCourseCallback();
            }

            importAgilityCourse(course, masteries, pillar) {
                // clear current values
                this.data.course.fill(-1);
                this.data.courseMastery.fill(false);
                // import settings
                this.data.course.forEach((_, category) => {
                    let obstacleID = course[category];
                    if (obstacleID === undefined) {
                        obstacleID = -1;
                    }
                    this.selectObstacle(category, this.agilityObstacles[obstacleID + 1]);
                    if (masteries[obstacleID]) {
                        this.data.courseMastery[category] = true;
                        this.updateAgilityTooltips(category);
                    }
                });
                this.data.pillar = pillar;
                this.selectObstacle(this.agilityCategories, this.agilityPillars[pillar + 1]);
                // set image selection
                this.data.courseMastery.forEach((m, i) => {
                    const elt = document.getElementById(`MCS Agility Mastery ${i} ${this.id} Toggle Button`);
                    if (m) {
                        this.parent.selectButton(elt);
                    } else {
                        this.parent.unselectButton(elt);
                    }
                });
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
    waitLoadOrder(reqs, setup, 'AgilityCourse');

})();