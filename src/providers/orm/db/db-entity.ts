import { Injectable } from '@angular/core';
import { DB } from './db';
import { ModelEntity } from './model-entity';
import uuid from 'uuid/v1'; //here change 'v1' with the version you desire to use

@Injectable()
export class DBEntity<T extends ModelEntity<T>> {
    protected name: string;
    protected attributes: any;

    protected db: DB;

    protected modelType;

    constructor(modelType: any) {
        this.db = new DB();
        this.modelType = modelType;
    }

    getName() {
        return this.name;
    }

    getNew(): T {
        return new this.modelType();
    }

    createTable() {
        return this.db.createTable(this.name, this.attributes);
    }

    findAll(includeDeleted = false) {
        let parent = this;
        var p1 = new Promise<T[]>(function (resolve, reject) {
            parent.db.findAll(parent.name, includeDeleted).then(function (data) {
                let objects: T[] = [];
                objects = parent.queryResultToArray(data);
                resolve(objects);

            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }
    findBy(attribute: string, value: string | string[], includeDeleted = false) {
        let parent = this;
        var p1 = new Promise<T[]>(function (resolve, reject) {
            parent.db.findBy(parent.name, attribute, value, includeDeleted).then(function (data) {
                let objects: T[] = parent.queryResultToArray(data);
                resolve(objects);
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    populateAll(entities: ModelEntity<T>[]) {
        let promises = [];
        if (entities.length > 0) {
            let relationsName = entities[0].getAllRelationName();
            for (let relationName of relationsName) {
                let promise = this.populate(entities, relationName);
                promises.push(promise);
            }
        }
        return Promise.all(promises);
    }

    populate(entities: ModelEntity<T>[], relation) {
        return new Promise<T[]>((resolve, reject) => {
            if (entities == null || entities.length <= 0) {
                resolve([]);
            } else {
                let db = entities[0].getRelationDB(relation);

                if (db == null) {
                    reject("No relation defined in model (db is " + db + ")");
                } else {
                    let idArray = [];
                    for (let entity of entities) {
                        let id = entity.getRelationId(relation);
                        if (idArray.indexOf(id) == -1) {
                            idArray.push(id);
                        }
                    }
                    db.findBy("id", idArray, false).then((objects) => {
                        for (let entity of entities) {
                            for (let object of objects) {
                                if (entity.getRelationId(relation) == object.id) {
                                    entity.setRelation(relation, object);
                                    break;
                                }
                            }
                        }
                        resolve();
                    }, function (raison) {
                        reject(raison);
                    });
                }
            }
        });
    }

    protected queryResultToArray(data): T[] {
        let objects: T[] = [];
        if (data.rows.length > 0) {
            for (var i = 0; i < data.rows.length; i++) {
                let object: T = this.queryResultToObject(data.rows.item(i))
                objects.push(object);
            }
        }

        return objects;
    }

    protected queryResultToNumber(data): number {
        let number = 0
        if (data.rows.length > 0) {
            let item = data.rows.item(0);
            number = item.nb;
        }

        return number;
    }

    protected queryResultToObject(item): T {
        let object: T = this.getNew();
        object.createFromArray(item);

        return object;
    }
    findOne(id: number, includeDeleted = false) {
        let parent = this;
        var p1 = new Promise<T>(function (resolve, reject) {
            parent.db.findOne(parent.name, id, includeDeleted).then(function (data) {
                let object: T = null;
                if (data.rows.length > 0) {
                    object = parent.queryResultToObject(data.rows.item(0))
                }

                resolve(object);

            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }
    findOneBy(attribute: string, value: string | string[], includeDeleted = false) {
        let parent = this;
        var p1 = new Promise<T>(function (resolve, reject) {
            parent.db.findBy(parent.name, attribute, value, includeDeleted, 1).then(function (data) {
                let object: T = null;
                if (data.rows.length > 0) {
                    object = parent.queryResultToObject(data.rows.item(0))
                }

                resolve(object);

            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    destroy(id: number, logicalDelete = true) {
        return this.destroyBy("id", id.toString(), logicalDelete);
    }
    destroyBy(attribut: string, value: string | string[], logicalDelete = true) {
        let parent = this;
        var p1 = new Promise<any>(function (resolve, reject) {
            parent.db.delete(parent.name, attribut, value, logicalDelete).then(function (data) {
                resolve(data);
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    destroyWhere(attribut: string, operator: string, value: string, logicalDelete = true) {
        let parent = this;
        var p1 = new Promise<any>(function (resolve, reject) {
            parent.db.deleteWhere(parent.name, attribut, operator, value, logicalDelete).then(function (data) {
                resolve(data);
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }


    destroyAll(logicalDelete = true) {
        let parent = this;
        var p1 = new Promise<any>(function (resolve, reject) {
            parent.db.deleteAll(parent.name, logicalDelete).then(function () {
                resolve();
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    createAll(models: T[]) {
        let promises = [];

        for (let model of models) {
            promises.push(this.create(model));
        }
        return Promise.all(promises);
    }

    create(model: T) {
        var fields: any = [];
        var values: any = [];
        this.generateUniqueID(model);
        var valuesObject: any = model.toArray();
        for (var attrName in valuesObject) {
            let value = valuesObject[attrName];
            if (value !== undefined) {
                fields.push(attrName);
                values.push(value);
            }
        }


        let parent = this;
        var p1 = new Promise(function (resolve, reject) {
            parent.db.insert(parent.name, fields, values).then(function (valeur) {
                model.id = valeur.insertId;
                resolve();
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    updateAll(models: T[]) {
        let promises = [];

        for (let model of models) {
            promises.push(this.update(model));
        }
        return Promise.all(promises);
    }

    update(model: T) {
        var fields: any = [];
        var values: any = [];

        var valuesObject: any = model.toArray();
        for (var attrName in valuesObject) {
            let value = valuesObject[attrName];
            if (value !== undefined) {
                fields.push(attrName);
                values.push(value);
            }
        }


        let parent = this;
        var p1 = new Promise(function (resolve, reject) {
            parent.db.update(parent.name, "id", model.getPrimaryKey().toString(), fields, values).then(function (valeurs) {
                resolve();
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    updateBy(attribut: string, model: T) {
        var fields: any = [];
        var values: any = [];
        var valueId = "$EMPTY#//4154";

        var valuesObject: any = model.toArray();
        for (var attrName in valuesObject) {
            let value = valuesObject[attrName];
            if (value !== undefined) {

                if (attrName == attribut) {
                    valueId = value;
                } else {
                    fields.push(attrName);
                    values.push(value);
                }
            }


        }


        let parent = this;
        var p1 = new Promise(function (resolve, reject) {
            parent.db.update(parent.name, attribut, valueId, fields, values).then(function (valeurs) {
                resolve();
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    updateByMultiple(selections: any[], model: T) {
        var fields: any = [];
        var values: any = [];

        var valuesObject: any = model.toArray();

        for (var attrName in valuesObject) {
            let value = valuesObject[attrName];
            if (value !== undefined) {
                fields.push(attrName);
                values.push(value);
            }
        }


        let parent = this;
        var p1 = new Promise(function (resolve, reject) {
            parent.db.updateWithObject(parent.name, selections, fields, values).then(function (valeurs) {
                resolve();
            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }


    getIds(): Promise<any> {
        let parent = this;
        var p1 = new Promise<any>(function (resolve, reject) {
            parent.db.executeQuery("SELECT idServer FROM " + parent.name).then(function (data) {
                let arrayId: any = [];
                if (data.rows.length > 0) {
                    for (var i = 0; i < data.rows.length; i++) {
                        let idServer = data.rows.item(i).idServer;
                        if (idServer) {
                            arrayId.push(idServer);
                        }
                    }
                }
                resolve(arrayId);

            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    getAllCreatedData(nbRow = -1, offset = -1): Promise<T[]> {
        let parent = this;
        return new Promise<T[]>(function (resolve, reject) {
            parent.db.findBy(parent.name, "idServer", "0", false, nbRow, offset).then(function (data) {
                let objects: T[] = parent.queryResultToArray(data);
                resolve(objects);

            }, function (raison) {
                reject(raison);
            });
        });
    }
    getNbCreatedData(): Promise<number> {
        let parent = this;
        return new Promise<number>(function (resolve, reject) {
            parent.db.count(parent.name, [{ column: "idServer", operator: "=", value: "0" }]).then(function (data) {
                let nb = parent.queryResultToNumber(data);
                resolve(nb);
            }, function (raison) {
                reject(raison);
            });
        });
    }
    updateCreatedData(dataServer) {
        let data: any[] = [];
        for (let row of dataServer) {
            data.push({ name: this.name, colId: "id", valueId: row.idClient, fields: ["idServer", "updatedFlag"], values: [row.idServer, 0] })
        }
        return this.db.updateBatch(data);

    }

    insertBatch(models: T[]) {
        let data: any[] = [];

        for (let model of models) {
            var fields: any = [];
            var values: any = [];
            this.generateUniqueID(model);
            var valuesObject: any = model.toArray();
            for (var attrName in valuesObject) {
                let value = valuesObject[attrName];
                if (value !== undefined) {
                    fields.push(attrName);
                    values.push(value);
                }
            }
            data.push({ name: this.name, fields: fields, values: values })
        }
        return this.db.insertBatch(data);

    }



    getAllDeletedData(nbRow = -1, offset = -1): Promise<T[]> {
        let parent = this;
        return new Promise<T[]>(function (resolve, reject) {
            parent.db.findBy(parent.name, "deletedFlag", "1", true, nbRow, offset).then(function (data) {
                let objects: T[] = parent.queryResultToArray(data);
                resolve(objects);

            }, function (raison) {
                reject(raison);
            });
        });
    }
    getNbDeletedData(): Promise<number> {
        let parent = this;
        return new Promise<number>(function (resolve, reject) {
            parent.db.count(parent.name, [{ column: "deletedFlag", operator: "=", value: "1" }], true).then(function (data) {
                let nb = parent.queryResultToNumber(data);
                resolve(nb);
            }, function (raison) {
                reject(raison);
            });
        });
    }

    getAllUpdatedData(nbRow = -1, offset = -1): Promise<T[]> {
        let parent = this;
        return new Promise<T[]>(function (resolve, reject) {
            parent.db.findBy(parent.name, "updatedFlag", "1", false, nbRow, offset).then(function (data) {
                let objects: T[] = parent.queryResultToArray(data);
                resolve(objects);

            }, function (raison) {
                reject(raison);
            });
        });
    }

    getNbUpdatedData(): Promise<number> {
        let parent = this;
        return new Promise<number>(function (resolve, reject) {
            parent.db.count(parent.name, [{ column: "updatedFlag", operator: "=", value: "1" }]).then(function (data) {
                let nb = parent.queryResultToNumber(data);
                resolve(nb);
            }, function (raison) {
                reject(raison);
            });
        });
    }
    generateUniqueID(model: T) {
        if (!model.sync_id && !model.idServer) {
            model.sync_id = uuid();
        }
    }
   
}
