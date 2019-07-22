import { Injectable } from '@angular/core';
import { SyncDataService } from './sync-data-service'
import { Http, Response, RequestOptions, Headers } from '@angular/http';
import 'rxjs/Rx';
import { Observable } from 'rxjs/Observable';


import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer';
import { LoggerService } from '../logger-service';
import { ConstantServices } from '../../constant-service';

@Injectable()
export class SyncUpDataService {

    protected actionCreateUrl = 'createSync'; //nom de la méthode de création sur le serveur
    protected actionUpdateUrl = 'updateSync'; //nom de la méthode de modification sur le serveur
    protected actionDeleteUrl = 'deleteSync'; //nom de la méthode de suppression sur le serveur
    protected actionUploadUrl = 'uploadFile'; //nom de la méthode d'upload de fichier sur le serveur

    protected nbRetry = 5; //nombre d'essai lors de l'echec d'une requete HTTP
    protected timeout = 20000; //nombre de milliseconde avant un timeout sur une requete HTTP

    protected maxRowPerQuery = 1000;

    private fileUpload: FileTransferObject;


    /**
    * Table a synchroniser vers le serveur
    */
    protected tablesToSync: any = [
        "wrk_mouvement",
        "user",
        "wrk_groupe",
        "ref_emplacement",
        "wrk_inventaire",
    ];
    protected tablesToSyncTimeout: any = {
        "wrk_mouvement": 60000,
        "user": 20000,
        "wrk_groupe": 30000,
        "ref_emplacement": 20000,
        "wrk_inventaire": 30000,
    };

    constructor(private http: Http) {
        this.nbRetry = SyncDataService.nbRetry;

        this.fileUpload = new FileTransfer().create();

    }
    /**
     * Retourne le nombre total d'enregistrement à synchroniser (creation+modification+suppression) pour une table
     * @param tableName 
     */
    getNbDataNoSyncTable(tableName): Promise<number> {
        let nb = 0;
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        return new Promise<number>(function (resolve, reject) {
            tableDB.getNbCreatedData().then(function (nbCreated) {
                nb += nbCreated;
                tableDB.getNbDeletedData().then(function (nbDeleted) {
                    nb += nbDeleted;
                    tableDB.getNbUpdatedData().then(function (nbUpdated) {
                        nb += nbUpdated;
                        resolve(nb);
                    }).catch(function (error) {
                        reject(error);
                    });

                }).catch(function (error) {
                    reject(error);
                });

            }).catch(function (error) {
                reject(error);
            });
        });
    }
    /**
     * Retourne le nombre total d'enregistrement à synchroniser (creation+modification+suppression)
     */
    getNbDataNoSync() {
        let promises = [];
        for (let table of this.tablesToSync) {
            let promise = this.getNbDataNoSyncTable(table);
            promises.push(promise);
        }

        return new Promise<number>(function (resolve, reject) {
            Promise.all(promises).then(function (res) {
                let total = 0;
                for (let nb of res) {
                    total += nb;
                }
                resolve(total);
            }).catch(function (error) {
                reject(error);
            });
        });


    }

    /**
     * Synchronise toutes les tables vers le serveur
     */
    syncAllTables() {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            parent.tablesToSync.reduce(function (p, table) { //recuperation des donnees pour chaque table dans l'ordre
                return p.then(function () {
                    return parent.syncAllData(table);
                });
            }, Promise.resolve()).then(function (finalResult) {
                resolve();
            }, function (err) {
                reject(err);
            });
        });
    }

    /**
   * Synchronise toutes les tables passées en paramètre dans l'ordre
   */
    syncTables(tablesName: string[]) {
        return new Promise<any>((resolve, reject) => {
            tablesName.reduce((p, table) => { //recuperation des donnees pour chaque table dans l'ordre
                return p.then(() => {
                    return this.syncAllData(table);
                });
            }, Promise.resolve([])).then((finalResult) => {
                resolve();
            }, (err) => {
                reject(err);
            });
        });
    }


    /**
     * Synchronise les données créées, modifiées et supprimées vers le serveur pour une table
     * @param tableName 
     */
    syncAllData(tableName) {
        let promises = [];
        promises.push(this.syncCreatedData(tableName));
        promises.push(this.syncDeletedData(tableName));
        promises.push(this.syncUpdatedData(tableName));


        return Promise.all(promises);

    }


    /**
     * Synchronise les données créées pour une table
     * @param tableName 
     */
    syncCreatedData(tableName) {
        let resReturn = { message: null };
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;

        return new Promise<any>((resolve, reject) => {
            tableDB.getNbCreatedData().then((nbTotal) => {
                let arrayOffset = [];
                for (let i = 0; i < nbTotal; i = i + this.maxRowPerQuery) {
                    arrayOffset.push(i);
                }
                if (arrayOffset.length > 0) {
                    arrayOffset.reduce((p, i) => { //synchronisation des données en series
                        return p.then(() => {
                            return this.syncPartialCreatedData(tableName, this.maxRowPerQuery);
                        }, (error) => {
                            reject(error);
                        });
                    }, Promise.resolve()).then((finalResult) => {
                        LoggerService.info("All data created for table " + tableName);
                        resolve(finalResult);
                    }, (err) => {
                        reject(err);
                    });
                } else {
                    resReturn.message = "No created data to send for table " + tableName;
                    LoggerService.info(resReturn.message);
                    resolve(resReturn);
                }
            }).catch((error) => {
                reject(error);
            });
        });

    }

    /**
     * Synchronise une partie des  données créées pour une table
     * @param tableName la table àa synchroniser
     * @param limit le nombre de ligne
     * @param offset l'offset pour la recherche en BDD
     */
    syncPartialCreatedData(tableName, limit) {
        let resReturn = { message: null };
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        let apiURL = table.apiUrl;

        return new Promise<any>((resolve, reject) => {
            //Récupération et conversion des données en tableau pour la synchronisation
            tableDB.getAllCreatedData(limit).then((dataModel) => {
                tableDB.populateAll(dataModel).then(() => {
                    let promises = [];
                    for (let item of dataModel) {
                        let promise = new Promise<any>((resolve, reject) => {
                            item.toArraySync().then((array) => {
                                resolve(array);
                            }).catch((error) => {
                                //si une erreur survient sur une ligne, on affiche un log
                                //mais on continue la synchro pour les autres lignes
                                LoggerService.error(error);
                                resolve();
                            });
                        });
                        promises.push(promise);
                    }

                    //Envoi des données vers le serveur et mise à jour des idServer
                    Promise.all(promises).then((data) => {
                        if (data.length > 0) {
                            this.sendCreatedDataToServer(data, apiURL, tableDB, tableName).subscribe(
                                data => {
                                    this.updateIdServerForCreatedData(tableName, data).then(() => {

                                        resolve();
                                    }).catch((error) => {
                                        reject(error);
                                    });

                                }, error => {
                                    reject(error);
                                });
                        } else {

                            resolve(resReturn);
                        }

                    }).catch((error) => {
                        reject(error);
                    });


                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }

    /**
     * Synchronise les données supprimées pour une table
     * @param tableName 
     */
    syncDeletedData(tableName) {
        let resReturn = { message: null };
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;

        return new Promise<any>((resolve, reject) => {
            tableDB.getNbDeletedData().then((nbTotal) => {
                let arrayOffset = [];
                for (let i = 0; i < nbTotal; i = i + this.maxRowPerQuery) {
                    arrayOffset.push(i);
                }
                if (arrayOffset.length > 0) {
                    arrayOffset.reduce((p, i) => { //synchronisation des données en series
                        return p.then(() => {
                            return this.syncPartialDeletedData(tableName, this.maxRowPerQuery);
                        }, (error) => {
                            reject(error);
                        });
                    }, Promise.resolve()).then((finalResult) => {
                        LoggerService.info("All data deleted for table " + tableName);
                        resolve(finalResult);
                    }, (err) => {
                        reject(err);
                    });
                } else {
                    resReturn.message = "No deleted data to send for table " + tableName;
                    LoggerService.info(resReturn.message);
                    resolve(resReturn);
                }
            }).catch((error) => {
                reject(error);
            });
        });

    }

    /**
    * Synchronise une partie des  données supprimées pour une table
    * @param tableName la table à synchroniser
    * @param limit le nombre de ligne
    * @param offset l'offset pour la recherche en BDD
    */
    syncPartialDeletedData(tableName, limit) {
        let resReturn = { message: null };
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        let apiURL = table.apiUrl;

        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            tableDB.getAllDeletedData(limit).then(function (dataModel) {
                let data = [];
                for (let item of dataModel) {
                    data.push({ id: item.id, idServer: item.idServer });
                }

                if (data.length > 0) {
                    parent.sendDeletedDataToServer(data, apiURL, tableName).subscribe(
                        data => {
                            parent.deleteData(tableName, data).then(function () {

                                resolve();
                            }).catch(function (error) {
                                reject(error);
                            });;

                        }, error => {
                            reject(error);
                        });
                } else {
                    resolve(resReturn);
                }

            }).catch(function (error) {
                reject(error);
            });;
        });

    }
    /**
     * Synchronise les données modifiées pour une table
     * @param tableName 
     */
    syncUpdatedData(tableName) {
        let resReturn = { message: null };
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;

        return new Promise<any>((resolve, reject) => {
            tableDB.getNbUpdatedData().then((nbTotal) => {
                let arrayOffset = [];
                for (let i = 0; i < nbTotal; i = i + this.maxRowPerQuery) {
                    arrayOffset.push(i);
                }
                if (arrayOffset.length > 0) {
                    arrayOffset.reduce((p, i) => { //synchronisation des données en series
                        return p.then(() => {
                            return this.syncPartialUpdatedData(tableName, this.maxRowPerQuery);
                        }, (error) => {
                            reject(error);
                        });
                    }, Promise.resolve()).then((finalResult) => {
                        LoggerService.info("All data updated for table " + tableName);
                        resolve(finalResult);
                    }, (err) => {
                        reject(err);
                    });
                } else {
                    resReturn.message = "No updated data to send for table " + tableName;
                    LoggerService.info(resReturn.message);
                    resolve(resReturn);
                }
            }).catch((error) => {
                reject(error);
            });
        });
    }

    /**
   * Synchronise une partie des  données supprimées pour une table
   * @param tableName la table à synchroniser
   * @param limit le nombre de ligne
   * @param offset l'offset pour la recherche en BDD
   */
    syncPartialUpdatedData(tableName, limit) {
        let resReturn = { message: null };
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        let apiURL = table.apiUrl;

        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            tableDB.getAllUpdatedData(limit).then(function (dataModel) {
                tableDB.populateAll(dataModel).then(function () {
                    let promises = [];
                    let datesUpdated: string[] = [];
                    for (let item of dataModel) {
                        datesUpdated[item.id] = item.updatedAt;
                        let promise = new Promise<any>(function (resolve, reject) {
                            item.toArraySync().then(function (array) {
                                resolve(array);
                            }).catch(function (error) {
                                //si une erreur survient sur une ligne, on affiche un log
                                //mais on continue la synchro pour les autres lignes
                                LoggerService.error(error);
                                resolve();
                            });
                        });
                        promises.push(promise);
                    }

                    Promise.all(promises).then(function (data) {
                        if (data.length > 0) {
                            parent.sendUpdatedDataToServer(data, apiURL, tableDB, tableName).subscribe(
                                data => {
                                    parent.validateDataUpdated(tableName, data, datesUpdated).then(function () {

                                        resolve();
                                    }).catch(function (error) {
                                        reject(error);
                                    });;

                                }, error => {
                                    reject(error);
                                });
                        } else {
                            LoggerService.info(resReturn.message);
                            resolve(resReturn);
                        }
                    }).catch(function (error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });

            }).catch(function (error) {
                reject(error);
            });;
        });

    }

    /**
     * Envoi les données créées vers le serveur
     * @param data les données à créées
     * @param apiUrl l'url de l'api
     * @param tableDB le DBEntity assosié à la table
     */
    sendCreatedDataToServer(data, apiUrl, tableDB, tableName): Observable<any> {
        let parent = this;

        return new Observable<any>(observer => {
            parent.uploadFiles(data, apiUrl, tableDB).then(function () {
                let body = JSON.stringify({ data: data });
                let headers = new Headers({ 'Content-Type': 'application/json', token: ConstantServices.TOKEN });
                let options = new RequestOptions({ headers: headers });

                let timeout = parent.tablesToSyncTimeout[tableName] ? parent.tablesToSyncTimeout[tableName] : parent.timeout;

                timeout = timeout + Math.round(body.length / 5);//augmentation du timeout par rapport au nombre de données envoyées

                parent.http.post(SyncDataService.getServerURL() + apiUrl + parent.actionCreateUrl, body, options)
                    .map((res: Response) => res.json())
                    .timeout(timeout)
                    .retry(parent.nbRetry)
                    .subscribe(
                        data => {
                            observer.next(data);
                        }, error => {
                            observer.error(error);
                        });
            }).catch(function (error) {
                observer.error(error);
            })
        });

    }

    /**
    * Envoi les données à supprimer vers le serveur
    * @param data les données à supprimer
    * @param apiUrl l'url de l'api
    */
    sendDeletedDataToServer(data, apiUrl, tableName): Observable<any> {
        let body = JSON.stringify({ data: data });
        let headers = new Headers({ 'Content-Type': 'application/json', token: ConstantServices.TOKEN });
        let options = new RequestOptions({ headers: headers });

        let timeout = this.tablesToSyncTimeout[tableName] ? this.tablesToSyncTimeout[tableName] : this.timeout;

        timeout = timeout + Math.round(body.length / 5);//augmentation du timeout par rapport au nombre de données envoyées

        return this.http.post(SyncDataService.getServerURL() + apiUrl + this.actionDeleteUrl, body, options)
            .map((res: Response) => res.json())
            .timeout(timeout)
            .retry(this.nbRetry);
    }

    /**
     * Envoi les données à modifier vers le serveur
     * @param data les données à modifier
     * @param apiUrl l'url de l'api
     * @param tableDB le DBEntity assosié à la table
     */
    sendUpdatedDataToServer(data, apiUrl, tableDB, tableName): Observable<any> {
        let parent = this;

        return new Observable<any>(observer => {
            parent.uploadFiles(data, apiUrl, tableDB).then(function () {
                let body = JSON.stringify({ data: data });
                let headers = new Headers({ 'Content-Type': 'application/json', token: ConstantServices.TOKEN });
                let options = new RequestOptions({ headers: headers });

                let timeout = parent.tablesToSyncTimeout[tableName] ? parent.tablesToSyncTimeout[tableName] : parent.timeout;

                timeout = timeout + Math.round(body.length / 5); //augmentation du timeout par rapport au nombre de données envoyées

                parent.http.post(SyncDataService.getServerURL() + apiUrl + parent.actionUpdateUrl, body, options)
                    .map((res: Response) => res.json())
                    .timeout(timeout)
                    .retry(parent.nbRetry).subscribe(
                        data => {
                            observer.next(data);
                        }, error => {
                            observer.error(error);
                        });
            }).catch(function (error) {
                observer.error(error);
            })
        });
    }

    /**
     * Gestion de l'upload des fichiers sur le serveur, une fois les fichier uploader sur le serveur on sauvegarde le chemin du fichier en BDD
     * @param data un tableau de données dans lequel on recherche les champs de type fichier
     * @param apiUrl l'url de l'api pour l'upload
     * @param tableDB le DBEntity assosié à la table
     */
    uploadFiles(data, apiUrl, tableDB) {
        let promises = [];

        let attributes = tableDB.attributes;
        for (let row of data) {
            let promisesRow = [];
            for (let attr in row) {
                if (attr in attributes) {
                    if (attributes[attr].type == "file") {
                        if (row[attr]) {
                            let item = JSON.parse(row[attr]);
                            row[attr] = item;
                            if (item) {
                                for (let file of item) {
                                    if (file.local) {

                                        if (file.fileURL.indexOf('file:') == 0) {
                                            let parent = this;
                                            let options = {
                                                fileName: file.fileURL.split('/').pop(),
                                                headers: { token: ConstantServices.TOKEN }
                                            };
                                            let promise = new Promise<any>(function (resolve, reject) {
                                                parent.fileUpload.upload(file.fileURL, SyncDataService.getServerURL() + apiUrl + parent.actionUploadUrl, options).then(function (response) {
                                                    let res = JSON.parse(response.response);
                                                    file.fileURL = res.fileURL;
                                                    file.local = undefined;
                                                    LoggerService.info("File uploaded :" + file.fileURL);
                                                    resolve(attr);
                                                }).catch(function (error) {
                                                    reject(error);
                                                })
                                            });
                                            promisesRow.push(promise);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (promisesRow.length > 0) {
                let parent = this;
                let objectArray = row;
                //Enregistrement du chemin du fichier uploader sur le serveur en BDD, afin d'eviter les uploads multiple en cas d'erreur
                let promise = new Promise<any>(function (resolve, reject) {
                    Promise.all(promisesRow).then(function (attrs) {
                        parent.updateObjectWithFileURL(tableDB, objectArray, attrs).then(function () {
                            resolve();
                        }).catch(function (error) {
                            reject(error);
                        });
                    }).catch(function (error) {
                        reject(error);
                    });
                });

                promises.push(promise);
            }
        }

        return Promise.all(promises);
    }


    /**
     * Mise à jours du lien d'un champ de type fichier avec le lien sur le serveur
     * @param tableDB le DBEntity assosié à la table
     * @param objectArray un tableau correspondant à l'objet à mettre à jour en BDD
     * @param attrsUpdated un tableau des attributs à mettre à jour (attribut de type fichier)
     */
    updateObjectWithFileURL(tableDB, objectArray, attrsUpdated: Array<any>) {
        let promise = new Promise<any>(function (resolve, reject) {
            if (attrsUpdated.length > 0) {
                tableDB.findOne(objectArray.id).then(function (object) {
                    let currentObjectArray = object.toArray();
                    for (let attr of attrsUpdated) {
                        currentObjectArray[attr] = objectArray[attr];
                    }
                    object.createFromArray(currentObjectArray);
                    tableDB.update(object).then(function () {
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });
            } else {
                resolve();
            }
        });

        return promise;
    }

    /**
     * Mise à jour des idServer pour les données créées
     * @param tableName le nom de la table
     * @param dataFromServer les données recut du serveur comportant l'idServer
     */
    updateIdServerForCreatedData(tableName, dataFromServer) {
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        return tableDB.updateCreatedData(dataFromServer);
    }

    /**
     * Suppression physique des données supprimées en BDD
     * @param tableName le nom de la table
     * @param dataFromServer les données recut du serveur comportant les idServer à supprimer
     */
    deleteData(tableName, dataFromServer) {
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        let idsToDelete = [];
        for (let item of dataFromServer) {
            idsToDelete.push(item.idClient);
        }
        return tableDB.destroyBy("id", idsToDelete, false);

    }

    /**
     * Mise à jour du flag updatedFlag, une fois les données mise à jour sur le serveur
     * @param tableName le nom de la table
     * @param dataFromServer les données recu du serveur avec les id mise à jours
     * @param datesUpdated la date de mise à jour des données
     */
    validateDataUpdated(tableName, dataFromServer, datesUpdated) {
        let table = SyncDataService.tablesToSync[tableName];
        let tableDB = table.tableDB;
        let promises = [];
        for (let item of dataFromServer) {
            if (item != null) {
                let promise = new Promise<any>(function (resolve, reject) {
                    tableDB.findOne(item.idClient).then(function (object) {
                        object.updatedFlag = 0;
                        let dateUpdated = datesUpdated[object.id];
                        tableDB.updateByMultiple([{ column: "id", value: object.id }, { column: "updatedAt", operator: "<=", value: dateUpdated }], object).then(function () {
                            LoggerService.info("idClient updated  " + item.idClient);
                            resolve();
                        }).catch(function (err) {
                            reject(err);
                        });
                    }).catch(function (err) {
                        reject(err);
                    });
                });
                promises.push(promise);
            }
        }

        return Promise.all(promises);
    }


}