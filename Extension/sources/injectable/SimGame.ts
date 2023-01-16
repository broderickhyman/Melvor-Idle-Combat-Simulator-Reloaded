/*  Melvor Idle Combat Simulator

    Copyright (C) <2022, 2023> <Broderick Hyman>

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

class SimGame extends Game {
    micsr: MICSR;
    // @ts-expect-error Force SimManager type
    combat: SimManager;
    isWebWorker: boolean;

    constructor(micsr: MICSR, isWebWorker: boolean) {
        super();
        this.micsr = micsr;
        this.isWebWorker = isWebWorker;
        const demoNamespace =
            this.registeredNamespaces.getNamespace("melvorD")!;
        this.combat = new SimManager(this, demoNamespace) as any;
        this.detachGlobals();

        // Fix SimPlayer object to match replaced Player object
        // TODO: Re-enable this when we manage pets directly
        // this.combat.player.registerStatProvider(this.petManager);
        this.combat.player.registerStatProvider(this.shop);
        this.combat.player.registerStatProvider(this.potions);
    }

    detachGlobals() {
        this.township.tasks.updateMonsterTasks = () => null;
        this.completion.updatePet = () => null;
        this.petManager.unlockPet = () => null;
        this.bank.addItem = () => true;
        this.bank.hasItem = () => true;
        this.bank.getQty = () => 1e6;
        this.bank.removeItemQuantity = (
            item: AnyItem,
            quantity: number,
            removeItemCharges: boolean
        ): void => {
            switch (item.type) {
                case "Potion":
                    this.combat.player.usedPotions += quantity;
                    break;
                case "Rune":
                    if (this.combat.player.usedRunes[item.id] === undefined) {
                        this.combat.player.usedRunes[item.id] = 0;
                    }
                    this.combat.player.usedRunes[item.id] += quantity;
                    break;
            }
        };
        this.bank.checkForItems = (costs: AnyItemQuantity[]): boolean => {
            if (
                costs.find((x) => x.item.type === "Rune") !==
                undefined
            ) {
                return this.combat.player.hasRunes;
            }
            return true;
        }
        this.gp.add = (amount) => {
            // Store gp on the SimPlayer
            this.combat.player.gp += amount;
        };
    }

    postDataRegistration() {
        this.combatAreas.forEach((area) => {
          area.monsters.forEach((monster) => this.monsterAreas.set(monster, area));
        });
        this.slayerAreas.forEach((area) => {
          area.monsters.forEach((monster) => this.monsterAreas.set(monster, area));
          const slayerLevelReq = area.entryRequirements.find((req) => {
            return req.type === "SkillLevel" && req.skill === this.slayer;
          }) as SkillLevelRequirement;
          if (slayerLevelReq !== undefined)
            area.slayerLevelRequired = slayerLevelReq.level;
        });
        this.skills.filter(s => !this.micsr.bannedSkills.includes(s.localID)).forEach((skill) => skill.postDataRegistration());
        this.shop.postDataRegistration();
        // this.golbinRaid.postDataRegistration();
        this.combat.postDataRegistration();
        // @ts-expect-error
        this._passiveTickers = this.passiveActions.allObjects;
        // this.pages.forEach((page) => {
        //   if (page.action !== undefined) this.actionPageMap.set(page.action, page);
        //   if (page.skills !== undefined) {
        //     page.skills.forEach((skill) => {
        //       const pageArray = this.skillPageMap.get(skill);
        //       if (pageArray !== undefined) {
        //         pageArray.push(page);
        //       } else {
        //         this.skillPageMap.set(skill, [page]);
        //       }
        //     });
        //   }
        // });
        // this.settings.postDataRegistration();
      }

    onLoad() {
        // this.completion.onLoad();
        // this.bank.onLoad();
        // @ts-expect-error
        this.potions.computeProvidedStats(false);
        this.petManager.onLoad();
        this.shop.computeProvidedStats(false);
        this.combat.initialize();
        // this.gp.onLoad();
        // this.slayerCoins.onLoad();
        // this.raidCoins.onLoad();
        // this.settings.initializeToggles();
        // this.settings.initializeChoices();
        // this.township.postStatLoad();
        // this.township.tasks.onLoad();
        // this.settings.onLoad();

        const potion = this.combat.player.potion;
        if (potion && !this.potions.autoReusePotionsForAction(potion.action)) {
            this.potions.toggleAutoReusePotion(potion.action);
        }
    }

    resetToBlankState() {
        this.combat.player.resetToBlankState();
        // @ts-expect-error
        this.potions.activePotions.clear();
        this.combat.player.potion = undefined;
    }

    constructEventMatcher(data: GameEventMatcherData): GameEventMatcher {
        switch (data.type) {
            case "EnemyAttack":
            case "FoodEaten":
            case "MonsterDrop":
            case "MonsterKilled":
            case "PlayerAttack":
            case "PlayerHitpointRegeneration":
            case "PlayerSummonAttack":
            case "PotionChargeUsed":
            case "PotionUsed":
            case "PrayerPointConsumption":
            case "RuneConsumption":
            case "SummonTabletUsed":
                return super.constructEventMatcher(data);
        }
        return new CustomEventMatcher();
    }

    generateSaveStringSimple(): string {
        // @ts-expect-error
        const header = this.getSaveHeader();
        const writer = new SaveWriter("Write", 512);
        this.encodeSimple(writer);
        return writer.getSaveString(header);
    }

    encodeSimple(writer: SaveWriter): SaveWriter {
        // writer.writeFloat64(this.tickTimestamp);
        // writer.writeFloat64(this.saveTimestamp);
        // writer.writeBoolean(this.activeAction !== undefined);
        // if (this.activeAction !== undefined)
        //     writer.writeNamespacedObject(this.activeAction);
        // writer.writeBoolean(this.pausedAction !== undefined);
        // if (this.pausedAction !== undefined)
        //     writer.writeNamespacedObject(this.pausedAction);
        // writer.writeBoolean(this._isPaused);
        writer.writeBoolean(this.merchantsPermitRead);
        writer.writeNamespacedObject(this.currentGamemode);
        // writer.writeString(this.characterName);
        // this.bank.encode(writer);
        this.combat.encode(writer);
        // this.golbinRaid.encode(writer);
        // this.minibar.encode(writer);
        this.petManager.encode(writer);
        this.shop.encode(writer);
        // this.itemCharges.encode(writer);
        this.tutorial.encode(writer);
        this.potions.encode(writer);
        // this.stats.encode(writer);
        // this.settings.encode(writer);
        // this.gp.encode(writer);
        // this.slayerCoins.encode(writer);
        // this.raidCoins.encode(writer);
        // writer.writeArray(this.readNewsIDs, (newsID, writer) => {
        //     writer.writeString(newsID);
        // });
        // writer.writeString(this.lastLoadedGameVersion);
        // nativeManager.encode(writer);

        const goodSkills = this.skills.filter(
            (x) =>
                !this.micsr.bannedSkills
                    .map((bannedSkill: string) => `melvorD:${bannedSkill}`)
                    .includes(x.id)
        );

        writer.writeUint32(goodSkills.length);
        goodSkills.forEach((skill) => {
            writer.writeNamespacedObject(skill);
            writer.startMarkingWriteRegion();
            skill.encode(writer);
            writer.stopMarkingWriteRegion();
        });
        // mod.encode(writer);
        // this.completion.encode(writer);
        return writer;
    }

    decodeSimple(reader: SaveWriter, version: number): void {
        // let resetPaused = false;
        // this.tickTimestamp = reader.getFloat64();
        // this.saveTimestamp = reader.getFloat64();
        // if (reader.getBoolean()) {
        //     const activeAction = reader.getNamespacedObject(this.activeActions);
        //     if (typeof activeAction !== "string")
        //         this.activeAction = activeAction;
        // }
        // if (reader.getBoolean()) {
        //     const pausedAction = reader.getNamespacedObject(this.activeActions);
        //     if (typeof pausedAction === "string") resetPaused = true;
        //     else this.pausedAction = pausedAction;
        // }
        // this._isPaused = reader.getBoolean();
        this.merchantsPermitRead = reader.getBoolean();
        const gamemode = reader.getNamespacedObject(this.gamemodes);
        if (typeof gamemode === "string")
            throw new Error("Error loading save. Gamemode is not registered.");
        this.currentGamemode = gamemode;
        // this.characterName = reader.getString();
        // this.bank.decode(reader, version);
        this.combat.decode(reader, version);
        // this.golbinRaid.decode(reader, version);
        // this.minibar.decode(reader, version);
        this.petManager.decode(reader, version);
        this.shop.decode(reader, version);
        // this.itemCharges.decode(reader, version);
        this.tutorial.decode(reader, version);
        this.potions.decode(reader, version);
        // this.stats.decode(reader, version);
        // this.settings.decode(reader, version);
        // this.gp.decode(reader, version);
        // this.slayerCoins.decode(reader, version);
        // this.raidCoins.decode(reader, version);
        // this.readNewsIDs = reader.getArray((reader) => reader.getString());
        // this.lastLoadedGameVersion = reader.getString();
        // nativeManager.decode(reader, version);
        const numSkills = reader.getUint32();
        for (let i = 0; i < numSkills; i++) {
            const skill = reader.getNamespacedObject(this.skills);
            const skillDataSize = reader.getUint32();
            if (typeof skill === "string")
                reader.getFixedLengthBuffer(skillDataSize);
            else skill.decode(reader, version);
        }
        // mod.decode(reader, version);
        // if (version >= 26) this.completion.decode(reader, version);
        // if (resetPaused) {
        //     if (!this.isGolbinRaid) this._isPaused = false;
        // }
    }

    // Don't render
    render() {}
}

class CustomEventMatcher extends GameEventMatcher {
    doesEventMatch(event: GameEvent): boolean {
        return false;
    }
}
