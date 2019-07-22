
export abstract class ModelEntity<T> {

    public db: any;

    protected relations: any;

    public id: number = undefined;

    public createdAt: string = undefined;
    public updatedAt: string = undefined;


    public idServer: number = undefined;
    public sync_id: string = undefined;
    public updatedAtServer: string = undefined;
    public updatedFlag: number = undefined;
    public deletedFlag: number = undefined;

    constructor() {

    }

    getPrimaryKey(): number {
        return this.id;
    }
    getIdServer(): number {
        return this.idServer;
    }
    setIdServer(idServer) {
        this.idServer = idServer;
    }


    abstract createFromArray(data);

    abstract toArray(): any;

    createFromArrayExtractValue(value) {
        if (value == "") {
            return value;
        }
        if(value==null){
            return value;
        }
        return value ? value : undefined;
    }

    createFromArrayExtractBooleanValue(value) {
        if (typeof value == "boolean")
            return value;
        if (typeof value == "string") {
            if (value == "true") return true;
            return false;
        } else {
            return undefined;
        }
    }


    createFromArrayParseJsonObject(jsonValue) {
        let object = {};
        if (jsonValue != null) {
            if (typeof jsonValue == "string") {
                try {
                    object = JSON.parse(jsonValue);
                } catch (e) {
                    object = jsonValue;
                }
            } else {
                object = jsonValue;
            }
        } else {
            object = undefined;
        }

        return object;
    }


    toArrayStringifyJsonObject(value: Object) {
        if (value) {
            return JSON.stringify(value);
        }
        return value;
    }



    save(): Promise<T> {
        if (this.id == undefined) {
            return this.db.create(this);
        } else {
            return this.db.update(this);
        }
    }
    destroy(): Promise<any> {
        if (this.id != undefined) {
            return this.db.destroy(this.id);
        } else {
            return new Promise<any>(function (resolve, reject) {
                resolve();
            });
        }
    }



    createFromArrayDefaultAttribut(data) {
        this.id = data.id ? data.id : undefined;
        this.createdAt = data.createdAt ? data.createdAt : undefined;
        this.updatedAt = data.updatedAt ? data.updatedAt : undefined;
        this.updatedAtServer = data.updatedAtServer ? data.updatedAtServer : undefined;
        this.idServer = data.idServer ? data.idServer : undefined;
        this.updatedFlag = data.updatedFlag ? data.updatedFlag : undefined;
        this.deletedFlag = data.deletedFlag ? data.deletedFlag : undefined;
        this.sync_id = data.sync_id ? data.sync_id : undefined;
        return this;
    }
    toArrayAddDefaultAttribut(array: any): any {
        return Object.assign(array, {
            id: this.id,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            idServer: this.idServer,
            updatedAtServer: this.updatedAtServer,
            updatedFlag: this.updatedFlag,
            deletedFlag: this.deletedFlag,
            sync_id: this.sync_id
        });

    }

    getRelationId(relationName): string {
        let relation = this.relations[relationName];
        if (relation) {
            return this[relation.attrId];
        }
        return null;
    }

    getRelationDB(relationName): any {
        let relation = this.relations[relationName];
        if (relation) {
            return relation.db;
        }
        return null;
    }
    getRelationField(relationName) {
        let relation = this.relations[relationName];
        if (relation) {
            return relation.attrName;
        }
        return null;
    }

    setRelation(relationName, value) {
        this[relationName] = value;
    }

    getRelation(relation) {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            if (parent[relation.attrId]) {
                if (!parent[relation.attrName]) {
                    relation.db.findOne(parent[relation.attrId]).then(function (object) {
                        if (object == null) {
                            reject("ID " + parent[relation.attrId] + " not found on " + relation.db.name + " for " + JSON.stringify(parent));
                        } else {
                            parent[relation.attrName] = object;
                            resolve(parent[relation.attrName]);
                        }
                    }).catch(function (error) {
                        reject(error);
                    });
                } else {
                    resolve(parent[relation.attrName]);
                }
            } else {
                resolve(null);
            }
        });
    }
    getAllRelationName(): string[] {
        let relationNames = [];
        for (let relationName in this.relations) {
            relationNames.push(relationName);
        }
        return relationNames;
    }

    toArraySync(): Promise<any> {
        let parent = this;

        let promises = [];
        for (let attr in this.relations) {
            let relation = this.relations[attr];

            let promise = new Promise<any>(function (resolve, reject) {
                parent.getRelation(relation).then(function (object) {
                    if (object != null) {
                        parent[relation.attrId] = object.idServer;

                    } else {
                        parent[relation.attrId] = null;
                    }
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            });

            promises.push(promise);
        }

        return new Promise<any>(function (resolve, reject) {
            Promise.all(promises).then(function () {
                let array = parent.toArray();
                array = parent.toArraySyncUndefinedToNull(array);
                delete array["createdAt"];
                delete array["updatedAt"];
                resolve(array);
            }).catch(function (error) {
                reject(error);
            });
        });


    }

    toArraySyncUndefinedToNull(array) {
        if (array) {
            for (let key in array) {
                let value = array[key];
                if (value == undefined) {
                    array[key] = null;
                }
            }
        }

        return array;
    }

    /**
     * Permet de transformer les données provenant du serveur any[] en model-entity
     * @param data Les données provenant du serveur à transformer en objet model-entity
     * @param arrayIdClientServer un tableau comportant la correspondance idServer=>idClient pour les relations ex: arrayIdClientServer[relation][idServer]=>idClient
     * Cet attribut (si il est remplit) permet d'éviter de faire une requete SELECT vers les relations à chaque fois 
     * (cette méthode remplit le tableau avec les correspondances idServer=>idClient)
     */
    createFromArraySync(data, arrayIdClientServer?: any[]): Promise<ModelEntity<T>> {
        arrayIdClientServer = arrayIdClientServer ? arrayIdClientServer : [];
        this.createFromArray(data);
        let promises = [];
        for (let attr in this.relations) {
            let relation = this.relations[attr];

            let promise = new Promise<any>((resolve, reject) => {
                if (this[relation.attrId]) {
                    if ((relation.attrId in arrayIdClientServer) && (this[relation.attrId] + "") in arrayIdClientServer[relation.attrId]) {
                        this[relation.attrId] = arrayIdClientServer[relation.attrId][this[relation.attrId] + ""];
                        resolve();
                        return true;
                    }
                    relation.db.findBy("idServer", this[relation.attrId]).then((objects) => {
                        if (objects.length > 0) {
                            if (!(relation.attrId in arrayIdClientServer)) {
                                arrayIdClientServer[relation.attrId] = [];
                            }
                            arrayIdClientServer[relation.attrId][this[relation.attrId] + ""] = objects[0].id;
                            this[relation.attrId] = objects[0].id;
                            resolve();
                        } else {
                            reject("ID " + this[relation.attrId] + " not found on " + relation.db.name + " for " + JSON.stringify(this));
                        }
                    }).catch(function (error) {
                        reject(error);
                    });

                } else {
                    resolve();
                }
            });

            promises.push(promise);
        }

        return new Promise<ModelEntity<T>>((resolve, reject) => {
            Promise.all(promises).then(() => {
                resolve(this);
            }).catch(function (error) {
                reject(error);
            });
        });


    }



}
