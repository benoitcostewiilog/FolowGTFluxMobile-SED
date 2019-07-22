import { Injectable } from '@angular/core';
import { SyncDataService } from './sync-data-service'
import { SyncDB } from './db/sync-db'
import { SyncModel } from './model/sync-model';
import { Http, Response, RequestOptions, Headers } from '@angular/http';
import 'rxjs/Rx';
import { LoggerService } from '../logger-service';
import { SyncEventsService } from './sync-events-service';

@Injectable()
export class SyncDownDataService {

    protected db: SyncDB;
    protected apiUrl: string = "tables/"; //api permettant de savoir quelle table doit etre synchronisée
    protected actionCheckUrl = 'checkTable'; //nom de la méthode de récupération des données sur le serveur

    protected nbRetry = 5; //nombre d'essai lors de l'echec d'une requete HTTP
    protected timeout = 20000; //nombre de milliseconde avant un timeout sur une requete HTTP
    protected maxRowPerQuery = 1000;

    /**
     * Table a synchroniser depuis le serveur (les tables seront synchronisé dans l'ordre)
     */
    protected tablesToSync: any = [
        "user",
        "ref_emplacement",
        "wrk_groupe",
        "adm_supervision_parametrage",
        "wrk_mouvement",
    ];

    protected tablesToSyncTimeout: any = {
        "user": 20000,
        "ref_emplacement": 20000,
        "wrk_groupe": 20000,
        "adm_supervision_parametrage": 20000,
        "wrk_mouvement": 60000,
    };

    /**
     * Condition à envoyer vers le serveur pour ne récupérer qu'une partie des données (ex:filtre des données en fonction du user)
     */
    public syncCondition: any = {
        // "wrk_mouvement": { id_utilisateur: undefined } //user à remplir à la connexion
    };


    constructor(private http: Http) {
        this.db = new SyncDB();
        this.nbRetry = SyncDataService.nbRetry;

    }

    /**
     * Insertion en BDD des tables à synchroniser depuis le serveur
     */
    insertTableSync() {
        let promises = [];
        for (let tableName of this.tablesToSync) {
            let table = SyncDataService.tablesToSync[tableName].tableDB;
            let tableNameServer = SyncDataService.tablesToSync[tableName].tableServer;
            let promise = this.db.insertIfNotExist(table.getName(), tableNameServer);
            promises.push(promise);
        }

        return Promise.all(promises);

    }

    /**
     * Mise à jour de toutes les tables depuis le serveur
     */
    syncAll(): Promise<any> {
        let tableName: string[] = [];
        return this.sync(tableName);
    }


    /**
     * Mise à jour des table passé en parametres depuis le serveur
     * @param tableName un tableau comportant le nom des tables
     */
    sync(tableName: string[]): Promise<any> {
        let resReturn = { change: false, message: null };
        let parent = this;

        var p1 = new Promise<any>(function (resolve, reject) {
            parent.db.getSyncData(tableName).then(function (syncData) {
                parent.retreiveTableToSyncFromServer(syncData).subscribe(
                    data => {
                        LoggerService.info("TableToSync : ", data);

                        if (data.length > 0) {
                            parent.syncTableReceivedFromServer(data).then(function (res) {
                                resolve(res);
                            }).catch(function (error) {
                                reject(error);
                            });

                        } else {
                            resReturn.message = "No table received from server";
                            LoggerService.info(resReturn.message);
                            resolve(resReturn);
                        }
                    }, error => {
                        reject(error);
                    });
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;

    }

    /**
     * Mise à jour des tables envoyées par les serveur necessitant une mise à jour
     * @param tablesServer un tableau de table envoyer par le serveur
     */
    syncTableReceivedFromServer(tablesServer) {
        let parent = this;

        let tableToSyncOrdered = [];
        for (let tableToSync of parent.tablesToSync) {
            let table = SyncDataService.tablesToSync[tableToSync];
            for (let tableServerInfo of tablesServer) {
                if (tableServerInfo.table == table.tableServer) {
                    tableToSyncOrdered.push(tableServerInfo);
                }


            }


        }

        return new Promise<any>(function (resolve, reject) {
            tableToSyncOrdered.reduce(function (p, tableServerInfo) { //recuperation des donnees pour chaque table dans l'ordre
                return p.then(function () {
                    return parent.syncOneTableReceivedFromServer(tableServerInfo);
                });
            }, Promise.resolve()).then(function (finalResult) {
                resolve();
            }, function (err) {
                reject(err);
            });
        });

    }

    /**
     * Synchronisation d'une table à partir des informations envoyées par le serveur (nom de la table et syncAt)
     * Mise à jour en BDD et mise à jour de la table Sync
     * @param tableServerInfo {table:nom , syncAt:date}
     */
    syncOneTableReceivedFromServer(tableServerInfo) {
        let parent = this;
        let resReturn = { change: false, message: null };
        return new Promise<any>(function (resolve, reject) {
            parent.db.findBy("nameServer", tableServerInfo.table, true).then(function (tablesModel) {
                if (tablesModel.length > 0) {
                    parent.syncOneTable(tablesModel[0]).then(function () {
                        parent.updateTableSync(tablesModel[0].name, tableServerInfo.syncAt, tableServerInfo.nbRow).then(function () {
                            let resReturn: any = { change: true };
                            resolve(resReturn);
                        }, error => {
                            reject(error);
                        });
                    }, function (raison) {
                        reject(raison);
                    });
                } else {
                    resReturn.message = "Table " + tableServerInfo.table + " not found on client";
                    LoggerService.info(resReturn.message);
                    resolve(resReturn);
                }
            }, function (raison) {
                reject(raison);
            });
        });
    }

    /**
     * Récupération des données d'une table depuis le serveur et mise à jour en BDD
     * @param table 
     */
    syncOneTable(table: SyncModel) {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            if (table.name in SyncDataService.tablesToSync) {
                let tableClient = SyncDataService.tablesToSync[table.name];
                let condition = {};
                if (table.name in parent.syncCondition) {
                    condition = parent.syncCondition[table.name];
                }
                tableClient.tableDB.getIds().then(function (arrayId) {

                    parent.retreiveTableFromServer(tableClient.apiUrl, arrayId, table.syncAt, condition, table.name).subscribe(
                        data => {
                            LoggerService.info("Data receive from server : ", data);
                            parent.updateTableFromServer(data, tableClient.tableDB).then(function () {
                                resolve();
                            }, function (raison) {
                                reject(raison);
                            });

                        }, error => {
                            reject(error);
                        });

                }, function (raison) {
                    reject(raison);
                });

            }
        });
    }

    /**
     * Envoi d'une requete vers le serveur pour savoir quelle tables doivent etres mise à jour
     * @param nameAndSyncAtArray un tableau de table avec leur date de derniere mise à jour
     */
    retreiveTableToSyncFromServer(nameAndSyncAtArray) {
        let body = JSON.stringify({ data: nameAndSyncAtArray });
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });

        return this.http.post(SyncDataService.getServerURL() + this.apiUrl + this.actionCheckUrl, body, options)
            .map((res: Response) => res.json())
            .timeout(this.timeout)
            .retry(this.nbRetry);
    }

    /**
     * Envoi d'une requete vers le serveur pour récuperer les données à mettre à jour d'une table
     * @param apiUrl le nom de l'api liée à la table
     * @param arrayIdClient un tableau d'id present sur le client pour gerer l'update et les deletes
     * @param syncAt la date de derniere mise à jour
     */
    retreiveTableFromServer(apiUrl: string, arrayIdClient, syncAt, condition, tableName) {
        let dataId: any = { data: arrayIdClient, syncAt: syncAt, condition: condition };
        let body = JSON.stringify(dataId);

        let timeout = this.tablesToSyncTimeout[tableName] ? this.tablesToSyncTimeout[tableName] : this.timeout;

        timeout = timeout + Math.round(body.length / 5);//augmentation du timeout par rapport au nombre de données envoyées

        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(SyncDataService.getServerURL() + apiUrl + this.actionCheckUrl, body, options)
            .map((res: Response) => res.json())
            .timeout(timeout)
            .retry(this.nbRetry);

    }




    /**
     * Mise à jour de la table Sync avec la date de synchronisation
     * @param name la table à mettre à jour
     * @param syncAt la nouvelle date de synchronisation
     */
    updateTableSync(name, syncAt, nbRow) {
        let tableToUpdate: SyncModel = new SyncModel();
        tableToUpdate.name = name;
        tableToUpdate.syncAt = syncAt;
        tableToUpdate.nbRow = nbRow;
        return this.db.updateBy("name", tableToUpdate);
    }

    /**
     * Mise à jour des données en BDD à partir des données envoyé par le serveur (gestion create, update, delete)
     * @param resultServer les données envoyé par le serveur
     * @param table le nom de la table
     */
    updateTableFromServer(resultServer: any, table: any) {
        let promises = [];

        if (resultServer.deleted) {
            let promise = this.deleteRow(resultServer.deleted, table);
            promises.push(promise);
        }
        if (resultServer.updated) {
            let promise = this.updateRow(resultServer.updated, table);
            promises.push(promise);
        }
        if (resultServer.created) {
            let promise = this.createRow(resultServer.created, table, 2);
            promises.push(promise);
        }

        return Promise.all(promises).then(() => {

            SyncEventsService.publishSyncDownOver(table.name);
            SyncEventsService.publishDataUpdated(table.name);
        });
    }

    /**
     * Suppression des lignes supprimées sur le serveur en BDD local
     * @param toDeleteRow tableau des idServer à supprimer
     * @param table le nom de la table
     */
    deleteRow(toDeleteRow: any, table: any) {
        let promises = [];

        let i, j, temparray, chunk = 500;
        for (i = 0, j = toDeleteRow.length; i < j; i += chunk) {
            temparray = toDeleteRow.slice(i, i + chunk);
            let promise = table.destroyBy("idServer", temparray, false);
            promises.push(promise);
        }

        return Promise.all(promises);
    }

    /**
     * Update des lignes modifiées sur le serveur en BDD local
     * @param toUpdateRow tableau des valeurs à mettre à jour
     * @param table le nom de la table
     */
    updateRow(toUpdateRow: any, table: any) {
        return new Promise<any>(function (resolve, reject) {
            let erreurs = [];

            toUpdateRow.reduce(function (p, value) { //recuperation des donnees pour chaque ligne dans l'ordre
                return p.then(function () {

                    let model = table.getNew();
                    value.idServer = value.id;
                    value.id = null;
                    return new Promise<any>(function (resolve, reject) {
                        model.createFromArraySync(value).then(function (modelUpdated) {
                            modelUpdated.updatedFlag = 0;
                            table.updateByMultiple([{ column: "idServer", value: modelUpdated.idServer }, { column: "updatedFlag", value: 0 }], modelUpdated).then(function () {
                                resolve(modelUpdated);
                            }).catch(function (error) {
                                erreurs.push(error);
                                resolve();
                            });
                        }).catch(function (error) {
                            erreurs.push(error);
                            resolve();
                        });
                    });


                });

            }, Promise.resolve()).then(function (finalResult) {

                if (erreurs.length > 0) {
                    reject(erreurs);
                } else {
                    resolve();
                }
            }, function (err) {
                reject(err);
            });
        });
    }

    /**
     * Creation des lignes créées sur le serveur en BDD local
     * @param toCreateRow tableau des valeurs à inserer
     * @param table la table db_entity
     */
    createRow(toCreateRow: any, table: any, retry?) {
        LoggerService.info("Sync down : createRow for " + table.name + " , retry :" + retry + " , nbData = " + toCreateRow.length);
        return new Promise<any>((resolve, reject) => {
            retry = retry ? retry : 0;
            let toCreateRowSplit = [];
            let toCreateRowError = [];
            while (toCreateRow.length) { //on separe le tableau en plusieurs petit tableau
                toCreateRowSplit.push(toCreateRow.splice(0, this.maxRowPerQuery));
            }

            let arrayIdClientServer = [];
            toCreateRowSplit.reduce((p, toCreateRow) => { //synchronisation des données en series
                return p.then(() => {
                    return new Promise<any>((resolve, reject) => {
                        this.insertCreatedData(table, toCreateRow, arrayIdClientServer).then((rowError) => {//insertion des données en BDD
                            for (let row of rowError) {
                                toCreateRowError.push(row);
                            }
                            resolve();
                        });
                    });
                });
            }, Promise.resolve()).then((finalResult) => {
                if (toCreateRowError.length > 0) { //certaines données n'ont pas pu etre enregistré
                    if (retry - 1 < 0) { //si on ne peut plus faire de retry on renvoi une erreur
                        reject("Synchronisation descendante, Impossible de créer les lignes : " + JSON.stringify(toCreateRowError));
                        return false;
                    }

                    this.createRow(toCreateRowError, table, retry - 1).then(() => { //on reexecute la méthode en baissant le retry pour les données non enregistrées
                        resolve();
                    }, (err) => {
                        reject(err);
                    });
                } else {
                    resolve(finalResult);
                }
            }, (err) => {
                reject(err);
            });
        });

    }

    /**
     * Retourne une promise, la valeur de la promise est un tableau contenant les lignes n'ayant pas pu etre inserer en BD
     * @param table la table db_entity
     * @param toCreateRow les lignes à inserer provenant du serveur
     */
    private insertCreatedData(table, toCreateRow, arrayIdClientServer): Promise<any> {
        return new Promise<any>(function (resolve, reject) {
            let modelsCreated = [];
            let toCreateRowError = [];
            toCreateRow.reduce((p, value) => { //recuperation des donnees pour chaque ligne dans l'ordre et création des objets
                return p.then(() => {
                    return new Promise<any>((resolve, reject) => {
                        let model = table.getNew();
                        value.idServer = value.id;
                        value.id = undefined;
                        model.createFromArraySync(value, arrayIdClientServer).then((modelCreated) => { //création du model
                            modelsCreated.push(modelCreated);
                            resolve();
                        }).catch((error) => {
                            value.id = value.idServer;
                            toCreateRowError.push(value);
                            resolve();
                        });
                    });
                });
            }, Promise.resolve()).then(function (finalResult) { //tous les objets sont créés
                if (modelsCreated.length > 0) {
                    table.insertBatch(modelsCreated).then(function (modelCreated) { //insertion de tous les objets en mode batch
                        resolve(toCreateRowError); //renvoi des lignes en erreurs
                    }).catch((error) => {
                        resolve(toCreateRow); //renvoi des lignes en erreurs
                    });
                } else {
                    resolve(toCreateRowError); //renvoi des lignes en erreurs
                }

            });
        });

    }

}