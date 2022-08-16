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
        'Card',
    ];

    const setup = () => {

        const MICSR = window.MICSR;

        /**
         * Class for cards with tabs
         */
        MICSR.TabCard = class extends MICSR.Card {

            constructor(idPrefix, init, ...args) {
                super(...args);
                this.selectedTab = 0;
                this.tabCount = 0;
                this.idPrefix = idPrefix;
                this.tabIDs = [];
                this.tabCards = [];
                if (init) {
                    this.addTabMenu();
                }
            }

            addPremadeTab(name, img, card) {
                return this.addTab(name, img, null, null, card);
            }

            addTab(title, img, height, inputWidth, card = null) {
                // update tab count
                const index = this.tabCount;
                this.tabCount++;
                // create tab id
                const tabID = MICSR.toId(`${this.idPrefix}-${title}-tab`);
                // set header
                this.addTabHeader(tabID, title, img, () => this.onTabClick(index));
                // create, insert and return card
                card = card ? card : new MICSR.Card(this.tabContainer, height, inputWidth);
                this.tabIDs.push(tabID);
                this.tabCards.push(card);
                if (index !== this.selectedTab) {
                    card.container.style.display = 'none';
                    card.className = 'mcsTabButton';
                } else {
                    card.className = 'mcsTabButton mcsTabButtonSelected';
                }
                return card;
            }

            onTabClick(tabID) {
                if (this.selectedTab === tabID) {
                    return;
                }
                this.tabCards[this.selectedTab].container.style.display = 'none';
                this.setTabIDToUnSelected(this.tabIDs[this.selectedTab]);
                this.tabCards[tabID].container.style.display = '';
                this.setTabIDToSelected(this.tabIDs[tabID]);
                this.selectedTab = tabID;
            };

            setTabIDToSelected(tabID) {
                document.getElementById(tabID).className = 'mcsTabButton mcsTabButtonSelected';
            }

            setTabIDToUnSelected(tabID) {
                document.getElementById(tabID).className = 'mcsTabButton';
            }

            /**
             * Adds a tab menu to the card, the tab elements will have their display toggled on and off when the tab is clicked
             * @return {HTMLDivElement}
             */
            addTabMenu() {
                this.header = document.createElement('div');
                this.header.className = 'mcsTabButtonContainer';
                this.container.appendChild(this.header);
                this.tabContainer = document.createElement('div');
                this.tabContainer.className = 'mcsTabContainer';
                this.container.appendChild(this.tabContainer);
            }

            addTabHeader(tabID, title, img, callBack) {
                // create img element
                const newImage = document.createElement('img');
                newImage.className = 'mcsButtonImage';
                newImage.id = `${tabID}-image`;
                newImage.src = img;
                // create tab element
                const newTab = document.createElement('button');
                newTab.type = 'button';
                newTab.id = tabID;
                newTab.className = 'mcsTabButton';
                newTab.dataset.tippyContent = title;
                newTab.onclick = callBack;
                newTab.appendChild(newImage);
                // attach tab to header
                this.header.appendChild(newTab);
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
    waitLoadOrder(reqs, setup, 'TabCard');

})();