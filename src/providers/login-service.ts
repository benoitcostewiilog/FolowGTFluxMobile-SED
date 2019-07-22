import { Injectable } from '@angular/core';

import { Storage } from '@ionic/storage';

import { UserDB } from './db/user-db';

import { LoggerService } from './orm/logger-service';

import { Http, Headers, RequestOptions, Response } from '@angular/http';

import { SyncDataService } from './orm/sync/sync-data-service';

import 'rxjs/Rx';
import * as moment from 'moment';


@Injectable()
export class LoginService {


    private userDB: UserDB;
    private static lastIdUser = null;

    constructor(private http: Http, private storage: Storage) {

        this.userDB = new UserDB();
    }


    isLogged(): Promise<any> {
        return this.storage.get('isLogged');
    }

    syncLogin(idUser) {
        this.syncUserStat(true, idUser);
    }
    syncLogout(idUser) {

    }

    syncUserStat(online, idUser) {
        if (idUser) {
            let userSync = SyncDataService.tablesToSync.user;


            let body = JSON.stringify({ last_login: moment().format("YYYY-MM-DD HH:mm:ss") });
            let headers = new Headers({ 'Content-Type': 'application/json' });
            let options = new RequestOptions({ headers: headers });

            this.http.post(SyncDataService.getServerURL() + userSync.apiUrl + idUser, body, options)
                .map((res: Response) => res.json())
                .timeout(SyncDataService.timeout)
                .retry(SyncDataService.nbRetry)
                .toPromise().catch(function (error) {
                    LoggerService.error(error);
                });
        }
    }

    getLoggedUser(): Promise<number> {
        let parent = this;
        return new Promise<number>(function (resolve, reject) {
            if (LoginService.lastIdUser) {
                resolve(LoginService.lastIdUser);
            } else {
                parent.storage.get('userId').then(function (id) {
                    LoginService.lastIdUser = id;
                    resolve(id);
                }).catch(function (error) {
                    reject(error);
                });
            }
        });
    }

    login(user: any, sync?: SyncDataService): Promise<any> {

        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            parent.userDB.findBy("password_nomade", user.password_nomade).then(function (usersModel) {
                if (usersModel.length > 0) {
                    let userModel = usersModel[0];
                    if (userModel.password_nomade == user.password_nomade) {
                        parent.storage.set('isLogged', true).then(function () {
                            LoginService.lastIdUser = userModel.id;
                            parent.storage.set('userId', userModel.id).then(function () {
                                parent.syncLogin(userModel.idServer);
                                resolve(userModel);
                            }).catch(function (error) {
                                reject(error);
                            });
                        }).catch(function (error) {
                            reject(error);
                        });
                    } else {
                        reject("Invalid password");
                    }
                } else {
                    reject("User not found");
                }
            }).catch(function (error) {
                reject(error);
            });
        });
    }



    logout(sync?: SyncDataService): Promise<any> {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            parent.storage.set('isLogged', false).then(function () {
                parent.getLoggedUser().then(function (id) {
                    if (id) {
                        parent.userDB.findOne(id).then(function (user) {
                            LoginService.lastIdUser = null;
                            parent.storage.set('user', null).then(function () {
                                if (user != null) {
                                    parent.syncLogout(user.idServer);
                                }
                                resolve();
                            }).catch(function (error) {
                                reject(error);
                            });
                        }).catch(function (error) {
                            reject(error);
                        });
                    } else {
                        LoginService.lastIdUser = null;
                        parent.storage.set('user', null).then(function () {
                            resolve();
                        }).catch(function (error) {
                            reject(error);
                        });
                    }

                }).catch(function (error) {
                    reject(error);
                });

            }).catch(function (error) {
                reject(error);
            });
        });
    }



}