import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { SyncDownDataService } from './sync-down-data-service'
import { SyncUpDataService } from './sync-up-data-service'
import { SyncPurgeDataService } from './sync-purge-data-service'

import { Storage } from '@ionic/storage';

import { SyncDB } from './db/sync-db'

import { UserDB } from '../../db/user-db';
import { RefEmplacementDB } from '../../db/ref-emplacement-db';
import { WrkGroupeDB } from '../../db/wrk-groupe-db';
import { WrkInventaireDB } from '../../db/wrk-inventaire-db';
import { WrkMouvementDB } from '../../db/wrk-mouvement-db';
import { AdmParametrageDB } from '../../db/adm-parametrage-db';


import { NetworkService } from '../../network-service';
import { LoggerService } from '../logger-service';
import { SailsSocketService } from '../../sails-socket-service';

import 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';

import * as moment from 'moment';

@Injectable()
export class SyncDataService {
    public static serverHost: string = "gt-sed.mobilestock.fr";
    public static serverPort: number = 1347;

    public static syncInterval = 300000;

    public static nbRetry = 5;
    public static timeout = 20000; //nombre de milliseconde avant un timeout sur une requete HTTP

    public static ready = false;

    public static socketReady = false;

    public static syncAllInProgress = false;

    public static tableSyncInProgress = [];


    private static autoSyncInProgress = false;

    private static searchForWaitingSyncInProgress = false;

    private static observer;

    private static lastFullSync = null; //moment object

    private static promiseCheckSync = Promise.resolve(true);
    private static isSyncPossibleProgress = false;


    /**
     * Table a synchroniser avec en cles le nom de la table client et en valeur l'api, la table sur le serveur et la classe DB client
     */
    public static tablesToSync: any;

    public static tablesToSyncInit: boolean = false;

    public syncDownDataService: SyncDownDataService;

    public syncUpDataService: SyncUpDataService;

    public syncPurgeDataService: SyncPurgeDataService;


    constructor(private http: Http, private storage: Storage, private networkService: NetworkService) {
        this.syncDownDataService = new SyncDownDataService(this.http);
        this.syncUpDataService = new SyncUpDataService(this.http);
        this.syncPurgeDataService = new SyncPurgeDataService();


    }

    public static initTablesToSync(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (SyncDataService.tablesToSyncInit == false) {
                SyncDataService.tablesToSync = {
                    user: { apiUrl: "sfguarduser/", tableServer: "sf_guard_user", tableDB: new UserDB() },
                    ref_emplacement: { apiUrl: "refemplacement/", tableServer: "ref_emplacement", tableDB: new RefEmplacementDB() },
                    wrk_mouvement: { apiUrl: "wrkmouvement/", tableServer: "wrk_mouvement", tableDB: new WrkMouvementDB() },
                    wrk_groupe: { apiUrl: "wrkgroupe/", tableServer: "wrk_groupe", tableDB: new WrkGroupeDB() },
                    adm_supervision_parametrage: { apiUrl: "admparametrage/", tableServer: "adm_supervision_parametrage", tableDB: new AdmParametrageDB() },
                    wrk_inventaire: { apiUrl: "wrkinventaire/", tableServer: "wrk_inventaire", tableDB: new WrkInventaireDB(), },
                };

                let dbs = [];
                for (let table in SyncDataService.tablesToSync) {
                    dbs.push(SyncDataService.tablesToSync[table].tableDB);
                }

                let syncDB = new SyncDB();
                dbs.push(syncDB);

                dbs.reduce(function (p, db) { //recuperation des donnees pour chaque table dans l'ordre
                    return p.then(function () {
                        return db.createTable();
                    });
                }, Promise.resolve()).then(function (finalResult) {
                    SyncDataService.tablesToSyncInit = true;
                    resolve();
                }, function (err) {
                    reject(err);
                });
            } else {
                resolve();
            }
        });

    }

    init(): Promise<any> {
        if (SyncDataService.ready == false) {
            SyncDataService.promiseCheckSync = Promise.resolve(true);
            SyncDataService.isSyncPossibleProgress = false;
            let promiseHost = this.storage.get('serverHost').then(function (host) {
                if (host != null) {
                    if(host=="mobilestock.fr"){
                        host="gt-sed.mobilestock.fr";
                    }
                    SyncDataService.serverHost = host;
                }

            });
            let promisePort = this.storage.get('serverPort').then(function (port) {
                if (port != null) {
                    SyncDataService.serverPort = port;
                }
            });

            let promiseInterval = this.storage.get('syncInterval').then(function (value) {
                if (value != null)
                    SyncDataService.syncInterval = value;
            });

            let promiseTables = SyncDataService.initTablesToSync();

            return new Promise<any>((resolve, reject) => {
                Promise.all([promiseHost, promisePort, promiseInterval, promiseTables]).then(() => {
                    this.syncDownDataService.insertTableSync().then(() => {
                        SyncDataService.ready = true;
                        resolve();
                    }, (error) => {
                        reject(error);
                    });

                }, (error) => {
                    reject(error);
                });
            });
        } else {
            return new Promise<any>(function (resolve, reject) {
                resolve();
            });
        }
    }

    static getServerURL() {
        return "https://" + SyncDataService.serverHost + ":" + SyncDataService.serverPort + "/";
    }

    changeServerURL(host, port): Promise<any> {
        let promises = [];

        promises.push(this.storage.set('serverHost', host));

        promises.push(this.storage.set('serverPort', port));

        SyncDataService.serverHost = host;
        SyncDataService.serverPort = port;

        return Promise.all(promises);

    }

    changeSyncInterval(newInterval): Promise<any> {
        SyncDataService.syncInterval = newInterval;
        return this.storage.set('syncInterval', newInterval);
    }

    stopAutoSync() {
        SyncDataService.autoSyncInProgress = false;
        this.closeSocket();
    }

    runAutoSync(): Observable<any> {
        if (!SyncDataService.autoSyncInProgress) {
            LoggerService.info("run auto sync , interval=" + SyncDataService.syncInterval);
            this.initSocket();
            this.checkNetworkConnected();
            SyncDataService.autoSyncInProgress = true;
            let parent = this;
            return new Observable<any>(observer => {

                SyncDataService.observer = observer;
                parent.runAutoSyncInterval();
            });

        } else {
            return new Observable<any>(observer => {
                SyncDataService.observer = observer;
            });
        }

    }

    runAutoSyncInterval() {
        if (SyncDataService.autoSyncInProgress) {
            this.init().then(() => {
                let parent = this;
                if (SyncDataService.syncInterval > 0) {
                    setTimeout(function () {
                        parent.syncAllData().then(function () {
                            parent.runAutoSyncInterval();
                            SyncDataService.observer.next();

                        }).catch(function (error) {
                            parent.runAutoSyncInterval();
                            SyncDataService.observer.error(error);
                        });
                    }, SyncDataService.syncInterval);

                } else {
                    setTimeout(function () {
                        parent.runAutoSyncInterval();
                    }, 60000);
                }
            });
        } else {
            SyncDataService.observer.complete();
        }
    }

    /**
     * Déclenche une synchronisation de toutes les données lorsque le réseau est récupéré
     */
    checkNetworkConnected() {
        NetworkService.getObservableOnChanged().subscribe((isConnected) => {
            if (isConnected) {
                this.syncAllData();
            }
        });
    }

    initSocket() {
        LoggerService.info("Init socket");
        this.init().then(() => {
            SailsSocketService.connect(SyncDataService.serverHost, SyncDataService.serverPort);
            SailsSocketService.on('connect').subscribe(() => { SailsSocketService.get('/tables'); });
            SailsSocketService.on('tables').subscribe((data) => {
                LoggerService.info("New data available for " + data.previous.name);
                let tableClient = data.previous.name;
                for (let nameClient in SyncDataService.tablesToSync) {
                    if (SyncDataService.tablesToSync[nameClient].tableServer == data.previous.name) {
                        tableClient = nameClient;
                        break;
                    }
                }
                this.syncOneTable(tableClient);
            });
            SyncDataService.socketReady = true;
        });

    }

    closeSocket() {
        SailsSocketService.close();
    }


    syncOneTable(tableName) {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            parent.syncUpOneTable(tableName).then(() => {
                parent.syncDownOneTable(tableName).then(() => {
                    resolve();
                }, (error) => reject(error));
            }, (error) => reject(error));
        });
    }

    syncUpOneTable(tableName) {
        let parent = this;
        return new Promise<any>((resolve, reject) => {
            this.isSyncPossible(tableName).then((syncPossible) => {
                if (syncPossible) {
                    parent.init().then(() => {
                        LoggerService.info("Start sync up " + tableName);
                        parent.syncUpDataService.syncAllData(tableName).then(function (res) {
                            LoggerService.info("End sync up " + tableName);
                            SyncDataService.removeTableSyncInProgress(tableName);
                            resolve();
                        }).catch(function (error) {
                            SyncDataService.removeTableSyncInProgress(tableName);
                            LoggerService.error(error);
                            reject();
                        });
                    }, (error) => {
                        SyncDataService.removeTableSyncInProgress(tableName);
                        LoggerService.error(error);
                        reject();
                    });
                } else {
                    SyncDataService.tablesToSync[tableName].toSyncUp = true;
                    parent.syncWaitingSync();
                    resolve();
                }
            });
        });
    }



    isSyncPossible(table): Promise<boolean> {
        let promise = SyncDataService.promiseCheckSync;
        let promiseCurrent = new Promise<boolean>((resolve, reject) => {
            promise.then(() => {
                LoggerService.info("Check if sync possible for : " + table);
                if (SyncDataService.isSyncPossibleProgress) {
                    LoggerService.error("Accès multiple à la méthode SyncDataService.isSyncPossible()");
                    resolve(false);
                    return false;
                }
                SyncDataService.isSyncPossibleProgress = true;

                if (!this.networkService.isConnected()) {
                    SyncDataService.isSyncPossibleProgress = false;
                    resolve(false);
                    return false;
                }
                LoggerService.info("Tables sync all in progress : " + SyncDataService.syncAllInProgress);

                if (SyncDataService.syncAllInProgress) {
                    SyncDataService.isSyncPossibleProgress = false;
                    resolve(false);
                    return false;
                }
                LoggerService.info("Tables sync in progress : " + JSON.stringify(SyncDataService.tableSyncInProgress));
                if (table == "all") {
                    if (SyncDataService.tableSyncInProgress.length > 0) {
                        SyncDataService.isSyncPossibleProgress = false;
                        resolve(false);
                        return false;
                    }
                } else {
                    if (SyncDataService.tableSyncInProgress.indexOf(table) >= 0) {
                        SyncDataService.isSyncPossibleProgress = false;
                        resolve(false);
                        return false;
                    }
                }
                if (table == "all") {
                    SyncDataService.syncAllInProgress = true;
                } else {
                    SyncDataService.addTableSyncInProgress(table);
                }


                SyncDataService.isSyncPossibleProgress = false;
                resolve(true);
                return true;
            });
        });

        SyncDataService.promiseCheckSync = promiseCurrent;
        return promiseCurrent;
    }

    static addTableSyncInProgress(tableName) {
        SyncDataService.tableSyncInProgress.push(tableName);
    }
    static removeTableSyncInProgress(tableName) {
        var index = SyncDataService.tableSyncInProgress.indexOf(tableName, 0);
        if (index > -1) {
            SyncDataService.tableSyncInProgress.splice(index, 1);
        }
    }


    syncDownOneTable(tableName) {
        let parent = this;
        return new Promise<any>((resolve, reject) => {
            this.isSyncPossible(tableName).then((syncPossible) => {
                if (syncPossible) {
                    parent.init().then(() => {
                        LoggerService.info("Start sync down " + tableName);
                        parent.syncDownDataService.sync([tableName]).then(function (res) {
                            LoggerService.info("End sync down " + tableName);
                            SyncDataService.removeTableSyncInProgress(tableName);
                            resolve();
                        }).catch(function (error) {
                            SyncDataService.removeTableSyncInProgress(tableName);
                            LoggerService.error(error);
                            reject();
                        });
                    }, (error) => {
                        SyncDataService.removeTableSyncInProgress(tableName);
                        LoggerService.error(error);
                        reject();
                    });
                } else {
                    SyncDataService.tablesToSync[tableName].toSyncDown = true;
                    parent.syncWaitingSync();
                    resolve();
                }
            });

        });
    }



    syncAllData() {
        let parent = this;
        return new Promise<any>((resolve, reject) => {
            this.isSyncPossible("all").then((syncPossible) => {
                if (syncPossible) {
                    parent.init().then(() => {
                        parent.syncUpDataService.syncAllTables().then(function (res) {

                            parent.syncDownDataService.insertTableSync().then(function () {

                                parent.syncDownDataService.syncAll().then(function () {
                                    parent.syncPurgeDataService.purgeAllTables().then(function () {
                                        LoggerService.info("syncDownDataService : syncAll over");
                                        SyncDataService.lastFullSync = moment();
                                        SyncDataService.syncAllInProgress = false;
                                        resolve();
                                    }).catch(function (error) {
                                        SyncDataService.syncAllInProgress = false;
                                        reject(error);
                                    });

                                }).catch(function (error) {
                                    SyncDataService.syncAllInProgress = false;
                                    reject(error);
                                });

                            }, function (error) {
                                SyncDataService.syncAllInProgress = false;
                                LoggerService.error(error);
                                reject(error);
                            });

                        }).catch(function (error) {
                            SyncDataService.syncAllInProgress = false;
                            LoggerService.error(error);
                            reject(error);
                        });
                    }, (error) => {
                        SyncDataService.syncAllInProgress = false;
                        LoggerService.error(error);
                        reject(error);
                    });

                } else {

                    for (let table in SyncDataService.tablesToSync) {
                        SyncDataService.tablesToSync[table].toSyncUp = true;
                        SyncDataService.tablesToSync[table].toSyncDown = true;
                    }
                    parent.syncWaitingSync();
                    resolve();
                }
            });

        });

    }


    syncWaitingSync() {
        if (SyncDataService.searchForWaitingSyncInProgress) {
            return false;
        }
        SyncDataService.searchForWaitingSyncInProgress = true;
        setTimeout(() => {
            SyncDataService.searchForWaitingSyncInProgress = false;
            LoggerService.info("Start to sync waiting tables");
            for (let table in SyncDataService.tablesToSync) {
                let syncUp = SyncDataService.tablesToSync[table].toSyncUp;
                SyncDataService.tablesToSync[table].toSyncUp = false;
                let syncDown = SyncDataService.tablesToSync[table].toSyncDown;
                SyncDataService.tablesToSync[table].toSyncDown = false;

                LoggerService.info("Sync waiting tables " + table + " , syncUp=" + syncUp + " , syncDown=" + syncDown);

                if (syncUp && syncDown) {
                    this.syncOneTable(table);
                } else {
                    if (syncUp) {
                        this.syncUpOneTable(table);
                    } else if (syncDown) {
                        this.syncDownOneTable(table);
                    }
                }
            }
        }, 3000);
        return true;
    }


    getLastFullSyncFormated() {
        if (SyncDataService.lastFullSync != null) {
            return SyncDataService.lastFullSync.format("DD/MM/YYYY HH:mm:ss");
        }
        return "";

    }
    getLastFullSyncMoment() {
        return SyncDataService.lastFullSync;
    }
    resetLastFullSync() {
        SyncDataService.lastFullSync = null;
    }

    /**
     * example :  isLastFullSyncInLast(5, "minutes")
     */
    isLastFullSyncInLast(value, type) {
        if (SyncDataService.lastFullSync != null) {
            let date = moment().subtract(value, type);
            return SyncDataService.lastFullSync.isSameOrAfter(date);
        }
        return false;
    }

    downloadApk() {
        let admparametrageDB = new AdmParametrageDB();
        admparametrageDB.getURLDownloadAPK().then((url) => {
            document.location.href = url;
        });

    }

}
