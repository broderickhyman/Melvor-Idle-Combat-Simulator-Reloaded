/*  Melvor Idle Combat Simulator

    Modified Copyright (C) <2020, 2021> <G. Miclotte>
    Modified Copyright (C) <2022, 2023> <Broderick Hyman>

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

interface IObstacle {
    [index: string]: any;
    category: ObstacleCategories | -1;
    id: number;
    description: string;
    media: string;
    modifiers: any;
    name: string;
    requirements: any;
}

interface IAgilityFilter {
    tag: string;
    text: string;
    media: string;
}

/**
 * Class for the cards in the bottom of the ui
 */
class AgilityCourse {
    agilityCategories: number;
    agilityObstacles: IObstacle[];
    agilityPillars: IObstacle[];
    player: SimPlayer;
    filter: IAgilityFilter;
    filters: IAgilityFilter[];
    id: any;
    media: any;
    parent: App;
    tmpModifiers: any;
    micsr: MICSR;

    constructor(parent: App, player: SimPlayer, filters: IAgilityFilter[]) {
        this.parent = parent;
        this.micsr = parent.micsr;
        this.player = player;
        this.filters = filters;
        this.filter = this.filters[0];
        this.id = Date.now();
        this.tmpModifiers = new PlayerModifiers();

        // icons
        this.media = {
            combat: "assets/media/skills/combat/combat.svg",
            gp: "assets/media/main/coins.svg",
            mastery: "assets/media/main/mastery_header.svg",
            stamina: "assets/media/main/stamina.svg",
            statistics: "assets/media/main/statistics_header.svg",
        };

        // copy obstacles
        this.agilityCategories = this.parent.actualGame.agility.maxObstacles;
        const noObstacle: IObstacle = {
            category: -1,
            id: -1,
            description: "",
            media: this.media.stamina,
            modifiers: {},
            name: "None",
            requirements: {},
        };
        this.agilityObstacles = [
            noObstacle,
            ...this.parent.actualGame.agility.actions.allObjects.map(
                (x, id) => {
                    const obstacle: IObstacle = {
                        category: x.category,
                        description: "",
                        id: id,
                        media: x.media,
                        modifiers: {},
                        name: x.name,
                        requirements: x.skillRequirements,
                    };
                    this.filters.forEach(
                        (filter) =>
                            (obstacle[filter.tag] =
                                this.micsr.showModifiersInstance.printRelevantModifiers(
                                    x.modifiers,
                                    filter.tag
                                ).length > 0)
                    );
                    return obstacle;
                }
            ),
        ];
        this.agilityPillars = [
            noObstacle,
            ...this.parent.actualGame.agility.pillars.allObjects.map(
                (x, id) => {
                    const pillar: IObstacle = {
                        category: -1,
                        description: "",
                        id: id,
                        media: [
                            this.media.combat,
                            this.media.statistics,
                            this.media.gp,
                            this.media.stamina,
                        ][id],
                        modifiers: {},
                        name: x.name,
                        requirements: {},
                    };
                    this.filters.forEach(
                        (filter: any) =>
                            (pillar[filter.tag] =
                                this.micsr.showModifiersInstance.printRelevantModifiers(
                                    x.modifiers,
                                    filter.tag
                                ).length > 0)
                    );
                    return pillar;
                }
            ),
        ];
    }

    createAgilityCourseContainer(card: Card, filter: IAgilityFilter) {
        this.filter = filter;
        card.addSectionTitle("Agility Course");

        let i = 0;
        for (; i <= this.agilityCategories + 1; i++) {
            const category = i;
            const obstacleSelectionContainer = card.createCCContainer();
            // mastery button
            if (category < this.agilityCategories + 1) {
                const masteryButton = card.createImageButton(
                    this.media.mastery,
                    `Agility Mastery ${category} ${this.id} Toggle`,
                    (event) => this.agilityMasteryOnClick(event, category),
                    "Small",
                    "99 Mastery"
                );
                masteryButton.className += " col-3";
                obstacleSelectionContainer.appendChild(masteryButton);
            } else {
                const emptyDiv = document.createElement("div");
                emptyDiv.className += " col-3";
                obstacleSelectionContainer.appendChild(emptyDiv);
            }
            // popup
            card.addMultiPopupMenu(
                [this.media.stamina],
                [`MICSR Obstacle ${category} ${this.id} Image`],
                [this.createAgilityPopup(category, filter)],
                ["None"],
                obstacleSelectionContainer
            );
            (
                obstacleSelectionContainer.lastChild! as HTMLDivElement
            ).className += " col-3";
            // label
            const labelDiv = document.createElement("div");
            labelDiv.className = "col-6";
            labelDiv.setAttribute(
                "style",
                "display: table; text-align: center;"
            );
            const label = document.createElement("label");
            label.id = `MICSR Obstacle ${category} ${this.id} Label`;
            label.textContent = "None";
            label.setAttribute(
                "style",
                "display: table-cell; vertical-align: middle;"
            );
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
    addObstacleMultiButton(
        card: Card,
        title: string,
        category: number,
        prop: string,
        isProp: boolean
    ) {
        const menuItems =
            category >= this.agilityCategories
                ? this.agilityPillars
                : this.agilityObstacles.filter(
                      (x) =>
                          x.category === -1 ||
                          (x[prop] === isProp && x.category === category)
                  );
        if (menuItems.length <= 1) {
            return;
        }
        const buttonMedia = menuItems.map((obstacle: any) => obstacle.media);
        const buttonIds = menuItems.map(
            (obstacle: any) => `${obstacle.name} ${this.id}`
        );
        const buttonCallbacks = menuItems.map((obstacle: any) => () => {
            this.selectObstacle(category, obstacle);
            this.parent.agilityCourseCallback();
        });
        const tooltips = menuItems.map((obstacle: any) =>
            this.getObstacleTooltip(category, obstacle)
        );
        card.addSectionTitle(title);
        card.addImageButtons(
            buttonMedia,
            buttonIds,
            "Small",
            buttonCallbacks,
            tooltips,
            "100%"
        );
    }

    getObstacleTooltip(category: number, obstacle: IObstacle) {
        let passives = `<div class="text-center">${obstacle.name}</div>`;
        if (this.player.courseMastery[category]) {
            this.tmpModifiers.addModifiers(obstacle.modifiers, 0.5);
        } else {
            this.tmpModifiers.addModifiers(obstacle.modifiers);
        }
        this.micsr.showModifiersInstance
            .printRelevantModifiers(this.tmpModifiers, this.filter.tag)
            .forEach((toPrint: any) => {
                passives += `<div class="${toPrint[1]}">${toPrint[0]}</div>`;
            });
        this.tmpModifiers.reset();
        return passives;
    }

    createAgilityPopup(category: number, filter: IAgilityFilter) {
        const obstacleSelectPopup = document.createElement("div");
        obstacleSelectPopup.className = "mcsPopup";
        // @ts-expect-error TS(2540): Cannot assign to 'style' because it is a read-only... Remove this comment to see the full error message
        obstacleSelectPopup.style = "width:350px;";
        const obstacleSelectCard = new Card(
            this.micsr,
            obstacleSelectPopup,
            "",
            "600px"
        );
        if (category === this.agilityCategories) {
            this.addObstacleMultiButton(
                obstacleSelectCard,
                "Pillars",
                category,
                filter.tag,
                true
            );
        } else if (category === this.agilityCategories + 1) {
            this.addObstacleMultiButton(
                obstacleSelectCard,
                "Elite Pillars",
                category,
                filter.tag,
                true
            );
        } else {
            this.addObstacleMultiButton(
                obstacleSelectCard,
                `${filter.text} Obstacles`,
                category,
                filter.tag,
                true
            );
            this.addObstacleMultiButton(
                obstacleSelectCard,
                "Other Obstacles",
                category,
                filter.tag,
                false
            );
        }
        return obstacleSelectPopup;
    }

    selectObstacle(category: number, obstacle: IObstacle) {
        // debugger;
        const label = document.getElementById(
            `MICSR Obstacle ${category} ${this.id} Label`
        )!;
        label.textContent = obstacle.name;
        this.setObstacleImage(category, obstacle);
        // if (category === 10) {
        //     this.player.pillar = obstacle.id;
        // }
        // else if (category === 14){
        //     this.player.pillarElite = obstacle.id;
        // } else {
        if (obstacle.category === -1) {
            this.player.course[category] = -1;
        } else {
            this.player.course[category] = obstacle.id;
        }
        // }
    }

    /**
     * Change the obstacle image
     */
    setObstacleImage(category: number, obstacle: IObstacle) {
        const img = document.getElementById(
            `MICSR Obstacle ${category} ${this.id} Image`
        );
        (img as any).src = obstacle.media;
        (img as any)._tippy.setContent(
            this.getObstacleTooltip(category, obstacle)
        );
    }

    updateAgilityTooltips(category: number) {
        this.agilityObstacles.forEach((obstacle) => {
            if (obstacle.category !== category) {
                return;
            }
            const button = document.getElementById(
                `MCS ${obstacle.name} ${this.id} Button`
            );
            (button as any)._tippy.setContent(
                this.getObstacleTooltip(category, obstacle)
            );
        });
        const obstacle =
            this.agilityObstacles[this.player.course[category] + 1];
        const img = document.getElementById(
            `MICSR Obstacle ${category} ${this.id} Image`
        );
        (img as any)._tippy.setContent(
            this.getObstacleTooltip(category, obstacle)
        );
    }

    agilityMasteryOnClick(event: MouseEvent, category: number) {
        // toggle
        if (this.player.courseMastery[category]) {
            this.player.courseMastery[category] = false;
            this.parent.unselectButton(
                event.currentTarget as HTMLButtonElement
            );
        } else {
            this.player.courseMastery[category] = true;
            this.parent.selectButton(event.currentTarget as HTMLButtonElement);
        }
        // update tool tips
        this.updateAgilityTooltips(category);
        // callback
        this.parent.agilityCourseCallback();
    }

    importAgilityCourse(
        courseObstacles: number[],
        masteries: boolean[],
        pillarID: string
    ) {
        // debugger;
        // clear current values
        this.player.course = Array(
            this.parent.actualGame.agility.maxObstacles
        ).fill(-1);
        this.player.courseMastery = Array(
            this.parent.actualGame.agility.maxObstacles
        ).fill(false);
        // import settings
        this.player.course.forEach((_, category) => {
            let obstacleID = courseObstacles[category];
            if (obstacleID === undefined) {
                obstacleID = -1;
            }
            this.selectObstacle(
                category,
                this.agilityObstacles[obstacleID + 1]
            );
            if (masteries[obstacleID]) {
                this.player.courseMastery[category] = true;
                this.updateAgilityTooltips(category);
            }
        });
        this.player.pillarID = pillarID;
        if (pillarID) {
            this.selectObstacle(
                this.agilityCategories,
                this.agilityPillars[
                    this.player.game.agility.pillars.allObjects.findIndex(
                        (v) => v.id === pillarID
                    )
                ]
            );
        }
        // set image selection
        this.player.courseMastery.forEach((m, i) => {
            const elt = document.getElementById(
                `MCS Agility Mastery ${i} ${this.id} Toggle Button`
            );
            if (elt) {
                if (m) {
                    this.parent.selectButton(elt);
                } else {
                    this.parent.unselectButton(elt);
                }
            }
        });
    }
}
