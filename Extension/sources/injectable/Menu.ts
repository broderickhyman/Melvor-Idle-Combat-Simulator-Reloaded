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

        MICSR.addModal = (title: any, id: any, content: any) => {
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
            // @ts-expect-error TS(2581): Cannot find name '$'. Do you need to install type ... Remove this comment to see the full error message
            const modalHeader = $(`<div class="block block-themed block-transparent mb-0"><div class="block-header bg-primary-dark">
        <h3 class="block-title">${title}</h3>
        <div class="block-options"><button type="button" class="btn-block-option" data-dismiss="modal" aria-label="Close">
        <i class="fa fa-fw fa-times"></i></button></div></div></div>`);
            // @ts-expect-error TS(2581): Cannot find name '$'. Do you need to install type ... Remove this comment to see the full error message
            $(modalContent).append(modalHeader);

            // add content
            content.forEach((x: any) => modalContent.appendChild(x));

            // insert modal
            // @ts-expect-error TS(2531): Object is possibly 'null'.
            document.getElementById('page-container').appendChild(modal);

            // return modal
            return modal;
        }

        MICSR.createMenu = (title: any, menuID: any, eyeID: any) => {
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
            (window as any).MICSR_eyeHidden = false;

            // insert menu before Minigames
            (document.getElementsByClassName('nav-main-heading') as any).forEach((heading: any) => {
                // @ts-expect-error TS(2304): Cannot find name 'getLangString'.
                if (heading.textContent === getLangString('PAGE_NAME_MISC', '1')) {
                    heading.parentElement.insertBefore(menu, heading);
                }
            });
        }

        /**
         * Callback for when sidebar eye is clicked
         */
        MICSR.headingEyeOnClick = (eyeID: any) => {
            const headingEye = document.getElementById(eyeID);
            if ((window as any).MICSR_eyeHidden) {
                // @ts-expect-error TS(2531): Object is possibly 'null'.
                headingEye.className = 'far fa-eye text-muted ml-1';
                (window as any).MICSR_menuTabs.forEach((tab: any) => tab.style.display = '');
                (window as any).MICSR_eyeHidden = false;
            } else {
                // @ts-expect-error TS(2531): Object is possibly 'null'.
                headingEye.className = 'far fa-eye-slash text-muted ml-1';
                (window as any).MICSR_menuTabs.forEach((tab: any) => tab.style.display = 'none');
                (window as any).MICSR_eyeHidden = true;
            }
        }

        MICSR.addMenuItem = (itemTitle: any, iconSrc: any, accessID: any, modalID: any, menuTitle = 'Tools', menuID = 'mcsToolsMenu', eyeID = 'mcsHeadingEye') => {
            MICSR.createMenu(menuTitle, menuID, eyeID);
            if ((window as any).MICSR_menuTabs === undefined) {
                (window as any).MICSR_menuTabs = [];
            }

            const tabDiv = document.createElement('li');
            (window as any).MICSR_menuTabs.push(tabDiv);
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

            // @ts-expect-error TS(2531): Object is possibly 'null'.
            document.getElementById(menuID).after(tabDiv);

            // return access point
            return tabDiv;
        }

        MICSR.destroyMenu = (menuItemId: any, modalID: any, menuID = 'mcsToolsMenu') => {
            // remove the MICSR tab access point
            const tab = document.getElementById(menuItemId);
            if (tab !== null) {
                (window as any).MICSR_menuTabs = (window as any).MICSR_menuTabs.filter((x: any) => x !== tab);
                tab.remove();
            }
            // remove the tools menu if it is empty
            const menu = document.getElementById(menuID);
            if (menu !== null && (menu as any).length === 0) {
                menu.remove();
            }
            // hide and remove the modal
            const modal = document.getElementById(modalID);
            if (modal !== null) {
                // @ts-expect-error TS(2581): Cannot find name '$'. Do you need to install type ... Remove this comment to see the full error message
                $(modal).modal('hide');
                // @ts-expect-error TS(2581): Cannot find name '$'. Do you need to install type ... Remove this comment to see the full error message
                $(modal).modal('dispose');
                modal.remove();
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
        if (characterSelected && !characterLoading) {
            loadCounter++;
        }
        if (loadCounter > 100) {
            console.log('Failed to load ' + id);
            return;
        }
        // check requirements
        // @ts-expect-error TS(2304): Cannot find name 'characterSelected'.
        let reqMet = characterSelected && !characterLoading;
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
    waitLoadOrder(reqs, setup, 'Menu');

})();