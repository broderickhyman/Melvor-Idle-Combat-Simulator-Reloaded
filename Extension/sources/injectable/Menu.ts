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

        MICSR.addModal = (title, id, content) => {
            // create modal
            const modal = document.createElement('div');
            modal.id = id;
            modal.className = 'modal';

            // create dialog
            const modalDialog = document.createElement('div');
            modalDialog.className = 'modal-dialog';
            modal.appendChild(modalDialog);

            // create content wrapper
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalDialog.appendChild(modalContent);

            // create header
            const modalHeader = $(`<div class="block block-themed block-transparent mb-0"><div class="block-header bg-primary-dark">
        <h3 class="block-title">${title}</h3>
        <div class="block-options"><button type="button" class="btn-block-option" data-dismiss="modal" aria-label="Close">
        <i class="fa fa-fw fa-times"></i></button></div></div></div>`);
            $(modalContent).append(modalHeader);

            // add content
            content.forEach(x => modalContent.appendChild(x));

            // insert modal
            document.getElementById('page-container').appendChild(modal);

            // return modal
            return modal;
        }

        MICSR.createMenu = (title, menuID, eyeID) => {
            // check if tools menu already exists
            let menu = document.getElementById(menuID);
            if (menu !== null) {
                return menu;
            }

            // Create new tools menu
            menu = document.createElement('li');
            menu.id = menuID;
            menu.className = 'nav-main-heading mcsNoSelect';
            menu.textContent = title;

            // Create heading eye
            const headingEye = document.createElement('i');
            headingEye.className = 'far fa-eye text-muted ml-1';
            headingEye.id = eyeID;
            headingEye.onclick = () => MICSR.headingEyeOnClick(eyeID);
            headingEye.style.cursor = 'pointer';
            menu.appendChild(headingEye);
            window.MICSR_eyeHidden = false;

            // insert menu before Minigames
            document.getElementsByClassName('nav-main-heading').forEach(heading => {
                if (heading.textContent === getLangString('PAGE_NAME_MISC', '1')) {
                    heading.parentElement.insertBefore(menu, heading);
                }
            });
        }

        /**
         * Callback for when sidebar eye is clicked
         */
        MICSR.headingEyeOnClick = (eyeID) => {
            const headingEye = document.getElementById(eyeID);
            if (window.MICSR_eyeHidden) {
                headingEye.className = 'far fa-eye text-muted ml-1';
                window.MICSR_menuTabs.forEach(tab => tab.style.display = '');
                window.MICSR_eyeHidden = false;
            } else {
                headingEye.className = 'far fa-eye-slash text-muted ml-1';
                window.MICSR_menuTabs.forEach(tab => tab.style.display = 'none');
                window.MICSR_eyeHidden = true;
            }
        }

        MICSR.addMenuItem = (itemTitle, iconSrc, accessID, modalID, menuTitle = 'Tools', menuID = 'mcsToolsMenu', eyeID = 'mcsHeadingEye') => {
            MICSR.createMenu(menuTitle, menuID, eyeID);
            if (window.MICSR_menuTabs === undefined) {
                window.MICSR_menuTabs = [];
            }

            const tabDiv = document.createElement('li');
            window.MICSR_menuTabs.push(tabDiv);
            tabDiv.id = accessID;
            tabDiv.style.cursor = 'pointer';
            tabDiv.className = 'nav-main-item mcsNoSelect';

            const menuButton = document.createElement('div');
            menuButton.className = 'nav-main-link nav-compact';
            menuButton.dataset.toggle = 'modal';
            menuButton.dataset.target = '#' + modalID;
            tabDiv.appendChild(menuButton);

            const icon = document.createElement('img');
            icon.className = 'nav-img';
            icon.src = iconSrc;
            menuButton.appendChild(icon);

            const menuText = document.createElement('span');
            menuText.className = 'nav-main-link-name';
            menuText.textContent = itemTitle;
            menuButton.appendChild(menuText);

            document.getElementById(menuID).after(tabDiv);

            // return access point
            return tabDiv;
        }

        MICSR.destroyMenu = (menuItemId, modalID, menuID = 'mcsToolsMenu') => {
            // remove the MICSR tab access point
            const tab = document.getElementById(menuItemId);
            if (tab !== null) {
                window.MICSR_menuTabs = window.MICSR_menuTabs.filter(x => x !== tab);
                tab.remove();
            }
            // remove the tools menu if it is empty
            const menu = document.getElementById(menuID);
            if (menu !== null && menu.length === 0) {
                menu.remove();
            }
            // hide and remove the modal
            const modal = document.getElementById(modalID);
            if (modal !== null) {
                $(modal).modal('hide');
                $(modal).modal('dispose');
                modal.remove();
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
    waitLoadOrder(reqs, setup, 'Menu');

})();