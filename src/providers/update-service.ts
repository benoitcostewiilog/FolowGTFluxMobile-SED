import { Injectable } from '@angular/core';
import { AppVersion } from '@ionic-native/app-version';

import { Storage } from '@ionic/storage';
import { DBPurgeService } from './orm/db/db-purge-service';

import { LoggerService } from './orm/logger-service';

@Injectable()
export class UpdateService {


    constructor(private storage: Storage, private appVersion: AppVersion) {

    }

    public isNewVersionCode(): Promise<Boolean> {
        let parent = this;
        return new Promise<Boolean>((resolve, reject) => {
            this.appVersion.getVersionCode().then(function (versionCode) {
                parent.storage.ready().then(() => {
                    parent.storage.get('versionCode').then((currentVersionCode) => {
                        LoggerService.info("Current version " + currentVersionCode);
                        if (currentVersionCode == null) {
                            parent.setCurrentVersionCode().then(() => resolve(false), (error) => reject(error));
                        } else if (versionCode != currentVersionCode) {
                            LoggerService.info("New version " + versionCode);
                            resolve(true);
                        } else {
                            resolve(false);

                        }
                    }).catch(function (error) {
                        reject();
                    });
                }).catch(function (error) {
                    reject();
                });
            }).catch(function (error) {
                reject();
            });
        });
    }
    /**
     * Retourne une Promise<Boolean>, true si il y a eu une update, false sinon
     */
    public checkVersion() {
        return new Promise<Boolean>((resolve, reject) => {
            this.isNewVersionCode().then((isNewVersion) => {
                if (isNewVersion) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }).catch(function (error) {
                reject();
            });
        });
    }

    public setCurrentVersionCode() {
        return new Promise<Boolean>((resolve, reject) => {
            this.appVersion.getVersionCode().then((versionCode) => {
                this.storage.set('versionCode', versionCode).then(() => resolve(), (error) => reject(error));
            });
        });
    }

    public updateApp() {
        return new Promise<Boolean>((resolve, reject) => {
            this.appVersion.getVersionCode().then((versionCode) => {
                this.clearBDD(versionCode).then(() => {
                    resolve(true);
                }).catch(function (error) {
                    reject();
                });
            }).catch(function (error) {
                reject();
            });
        });
    }

    /**
     * Efface la BDD et redemarre l'application
     */
    public clearBDD(newVersionCode) {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            let dbPurgeService = new DBPurgeService();

            dbPurgeService.dropAll().then(function () {
                dbPurgeService.createAll().then(function () {
                    parent.storage.set('versionCode', newVersionCode).then(function () {
                        resolve();
                    }).catch(function (error) {
                        reject();
                    });
                }).catch(function (error) {
                    reject();
                });
            }).catch(function (error) {
                reject();
            });

        });
    }
    
}