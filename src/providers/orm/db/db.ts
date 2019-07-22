import { Injectable } from '@angular/core';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';

import { LoggerService } from '../logger-service';

/*
  Generated class for the Bdd provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
*/
@Injectable()
export class DB {
    static storage: SQLiteObject = null;
    static tablesCreated: Array<String>;

    constructor() {
        DB.openDatabase();
        if (DB.tablesCreated == null) {
            DB.tablesCreated = [];
        }

    }

    static openDatabase() {
        var p1 = new Promise<SQLiteObject>(function (resolve, reject) {
            if (DB.storage == null) {
                let db = new SQLite();
                db.create({
                    name: 'gtRatierDb.db',
                    location: 'default'
                }).then((dbObject) => {
                    DB.storage = dbObject;
                    resolve(DB.storage);
                }, (err) => {
                    LoggerService.error(err);
                    reject(err);
                });
            } else {
                resolve(DB.storage);
            }
        });
        return p1;
    }

    createTable(name: string, fields: any) {
        let parent = this;
        var p1 = new Promise(function (resolve, reject) {
            if (DB.tablesCreated.indexOf(name) != -1) {
                resolve(true);
            } else {
                let query = "CREATE TABLE IF NOT EXISTS " + name + " (";
                query += parent.createPrimaryKey() + ", ";

                for (let name in fields) {
                    let value = fields[name];
                    let sql = parent.createAttrStringForCreate(name, value);
                    query += sql + ", ";
                }
                query += parent.createCreatedAt() + ", ";
                query += parent.createUpdatedAt() + ", ";

                query += parent.createIdServer() + ", ";
                query += parent.createSyncId() + ", ";
                query += parent.createUpdatedAtServer() + ", ";
                query += parent.createUpdatedFlag() + ", ";
                query += parent.createDeletedFlag();

                query += " );";


                LoggerService.info("Before execute query: " + query);
                DB.openDatabase().then((db) => {
                    db.executeSql(query, {}).then((data) => {
                        if (DB.tablesCreated.indexOf(name) == -1) {
                            DB.tablesCreated.push(name);
                        }

                        query = parent.getTriggerUpdatedAt(name);
                        LoggerService.info("Before execute query: " + query);
                        db.executeSql(query, {}).then((data) => {
                            resolve(data);
                        }, (error) => {
                            reject(error);
                        });
                    }, (error) => {
                        reject(error);
                    });
                }).catch((error) => { reject(error); });

            }
        });
        return p1;
    }

    dropTable(tableName) {
        var p1 = new Promise(function (resolve, reject) {
            DB.openDatabase().then((db) => {
                DB.storage.executeSql("DROP TABLE IF EXISTS " + tableName, {}).then(function (data) {
                    LoggerService.info("OK " + "DROP TABLE IF EXISTS " + tableName);

                    let index = DB.tablesCreated.indexOf(tableName);
                    while (index != -1) {
                        DB.tablesCreated.splice(index, 1);
                        index = DB.tablesCreated.indexOf(tableName);
                    }

                    resolve(data);
                }).catch(function (error) {
                    LoggerService.error(error);
                    reject(error);
                });
            }).catch((error) => { reject(error); });
        });
        return p1;
    }



    executeQuery(query: string, params: any = []) {
        var p1 = new Promise<any>(function (resolve, reject) {
            LoggerService.info("Before execute query: " + query + " , params:" + params);
            DB.openDatabase().then((db) => {
                DB.storage.executeSql(query, params).then((data) => {
                    resolve(data);
                }, (error) => {
                    reject(error);
                });
            }).catch((error) => { reject(error); });
        });
        return p1;
    }

    executeRawBatchQueries(batchQuery: any[]) {
        var p1 = new Promise<any>(function (resolve, reject) {
            LoggerService.info("Before execute query: ", batchQuery);
            DB.openDatabase().then((db) => {
                DB.storage.sqlBatch(batchQuery).then((data) => {
                    resolve(data);
                }, (error) => {
                    reject(error);
                });
            }).catch((error) => { reject(error); });
        });
        return p1;
    }

    findAll(name: string, includeDeleted = false) {
        let query: string = "";
        query = "SELECT * FROM " + name;

        if (!includeDeleted) {
            query += " WHERE deletedFlag=0";
        }
        return this.executeQuery(query);

    }


    findBy(name: string, attribut: string, value: String | string[], includeDeleted = false, limit = -1, offset = -1) {
        let query: string = "";
        query = "SELECT * FROM " + name;

        let queryValues = [];

        if (value instanceof Array) {
            let paramsArg = [];
            for (let i = 0; i < value.length; i++) {
                paramsArg.push("?");
            }
            query += " WHERE " + attribut + " IN (" + paramsArg.join() + ")";

            queryValues = value;
        } else {
            if (value == null) {
                query += " WHERE " + attribut + " IS NULL";
                queryValues = [];
            } else {
                query += " WHERE " + attribut + " = ?";
                queryValues = [value];
            }
        }


        if (!includeDeleted) {
            query += " AND deletedFlag=0";
        }
        if (limit > 0) {
            if (offset > 0) {
                query += " LIMIT " + offset + ", " + limit;
            } else {
                query += " LIMIT " + limit;
            }
        }
        return this.executeQuery(query, queryValues);

    }
    count(name: string, selections: any[], includeDeleted = false) {
        let query: string = "";
        let values = [];
        query = "SELECT COUNT(*) as nb FROM " + name;

        let res = this.buildQueryWhereClause(selections);
        query += res.query;
        for (let value of res.values) {
            values.push(value);
        }

        if (!includeDeleted) {
            query += " AND deletedFlag=0;";
        }

        return this.executeQuery(query, values);

    }

    private buildQueryWhereClause(selections: any[]) {
        let query = "";
        let values = []
        let i = 0;
        for (let whereValue of selections) {
            if (i == 0) {
                query += " WHERE ";

            } else {
                query += " AND ";
            }
            let operator = "=";
            if (whereValue.operator) {
                operator = whereValue.operator;
            }
            query += whereValue.column + " " + operator + " ? ";
            values.push(whereValue.value);
            i++;
        }

        return { query: query, values: values };
    }

    findOne(name: string, id: number, includeDeleted = false) {
        let query: string = "";
        query = "SELECT * FROM " + name + " WHERE id = ? "

        if (!includeDeleted) {
            query += " AND deletedFlag=0;";
        }
        return this.executeQuery(query, [id]);
    }

    delete(name: string, col: string, value: string | string[], logicalDelete = true) {
        let query: string = "";
        let queryValues = [];

        if (logicalDelete) {
            query = "UPDATE " + name + " SET deletedFlag=1 ";
        } else {
            query = "DELETE FROM " + name + " ";
        }

        if (value instanceof Array) {
            let paramsArg = [];
            for (let i = 0; i < value.length; i++) {
                paramsArg.push("?");
            }
            query += " WHERE " + col + " IN (" + paramsArg.join() + ")";

            queryValues = value;
        } else {
            if (value == null) {
                query += " WHERE " + col + " IS NULL";
                queryValues = [];
            } else {
                query += " WHERE " + col + " = ?";
                queryValues = [value];
            }
        }

        return this.executeQuery(query, queryValues);

    }
    deleteWhere(name: string, col: string, operator: string, value: string, logicalDelete = true) {
        let query: string = "";
        if (logicalDelete) {
            query = "UPDATE " + name + " SET deletedFlag=1 WHERE " + col + operator + "?;";
        } else {
            query = "DELETE FROM " + name + " WHERE " + col + operator + "?;";
        }
        return this.executeQuery(query, [value]);
    }

    deleteAll(name: string, logicalDelete = true) {
        let query: string = "";
        if (logicalDelete) {
            query = "UPDATE " + name + " SET deletedFlag=1;";
        } else {
            query = "DELETE FROM " + name + ";";
        }

        return this.executeQuery(query);
    }

    insert(name: string, fields: any, values: any) {
        let res = this.buildInsertQuery(name, fields, values);
        return this.executeQuery(res.query, res.values);

    }

    update(name: string, colId: string, valueId: string, fields: any, values: any) {
        let res = this.buildUpdateQuery(name, colId, valueId, fields, values);
        return this.executeQuery(res.query, res.values);
    }

    /**
     * Execution de plusieurs update sur des lignes ou des tables differentes
     * @param data un array d'objet {name: string, colId: string, valueId: string, fields: any, values: any}
     */
    updateBatch(data: any[]) {
        let batchQuery: any[] = [];
        for (let row of data) {
            let res = this.buildUpdateQuery(row.name, row.colId, row.valueId, row.fields, row.values);
            batchQuery.push([res.query, res.values]);
        }

        return this.executeRawBatchQueries(batchQuery);

    }
    /**
     * Execution de plusieurs insert sur des lignes ou des tables differentes
     * @param data un array d'objet {name: string, fields: any, values: any}
     */
    insertBatch(data: any[]) {
        let batchQuery: any[] = [];
        for (let row of data) {
            let res = this.buildInsertQuery(row.name, row.fields, row.values);
            batchQuery.push([res.query, res.values]);
        }

        return this.executeRawBatchQueries(batchQuery);

    }
    updateWithObject(name: string, selections: any[], fields: any, values: any) {
        let query: string = "";
        query = "UPDATE " + name + " SET";

        query += " updatedFlag=1, ";
        let i = 0;
        for (var field of fields) {
            query += " " + field + " = ?";
            if (i < fields.length - 1) {
                query += ", ";
            }
            i++;
        }

        let res = this.buildQueryWhereClause(selections);
        query += res.query;
        for (let value of res.values) {
            values.push(value);
        }



        return this.executeQuery(query, values);
    }


    createPrimaryKey() {
        return "id INTEGER PRIMARY KEY AUTOINCREMENT";
    }
    createUpdatedAt() {
        return "updatedAt timestamp NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))";
    }

    createIdServer() {
        return "idServer INTEGER DEFAULT 0";
    }

    createUpdatedAtServer() {
        return "updatedAtServer VARCHAR(255) NULL DEFAULT NULL";
    }

    createUpdatedFlag() {
        return "updatedFlag INTEGER DEFAULT 0";
    }
    createDeletedFlag() {
        return "deletedFlag INTEGER DEFAULT 0";
    }

    getTriggerUpdatedAt(name) {
        return "CREATE TRIGGER IF NOT EXISTS update_time_trigger_" + name +
            "  AFTER UPDATE ON " + name + " FOR EACH ROW" +
            "  BEGIN " +
            "UPDATE " + name +
            "  SET  updatedAt  = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')" +
            "  WHERE id = old.id;" +
            "  END";
    }
    createCreatedAt() {
        return "createdAt datetime NOT NULL DEFAULT '0000-00-00 00:00:00'";
    }
    createAttrStringForCreate(name: string, field: any) {
        let sql = name + " ";

        let size = 0;
        if (field.size > 0) {
            size = field.size;
        }
        sql += this.getTypeSql(field.type, size) + " ";

        if (field.required == true) {
            sql += "NOT NULL ";
        }
        if (field.defaultsTo != undefined) {
            sql += "DEFAULT " + field.defaultsTo + " ";
        }

        return sql;
    }

    buildUpdateQuery(name: string, colId: string, valueId: string, fields: any, values: any) {
        let query: string = "";
        query = "UPDATE " + name + " SET";

        query += " updatedFlag=1, ";
        let i = 0;
        for (var field of fields) {
            query += " " + field + " = ?";
            if (i < fields.length - 1) {
                query += ", ";
            }
            i++;
        }


        query += " WHERE " + colId + " = ? ;";
        values.push(valueId);
        return { query: query, values: values };
    }

    buildInsertQuery(name: string, fields: any, values: any) {
        let query: string = "";
        query = "INSERT INTO " + name + " (";

        let i = 0;
        for (var field of fields) {
            query += " " + field + " ";
            if (i < fields.length - 1) {
                query += ", ";
            }
            i++;
        }
        query += " ) VALUES( ";

        let nbValues = values.length;
        for (i = 0; i < nbValues; i++) {
            query += " ? ";
            if (i < nbValues - 1) {
                query += ", ";
            }
        }

        query += " );";
        return { query: query, values: values };
    }

    getTypeSql(type: string, size: number = 0) {
        switch (type) {
            case "string":
                if (size <= 0) size = 255;
                return "VARCHAR(" + size + ")";
            case "text":
                return "TEXT";
            case "json":
                return "TEXT";
            case "file":
                return "TEXT";
            case "integer":
                return "INTEGER";
            case "float":
                return "REAL";
            case "date":
                return "DATE";
            case "datetime":
                return "DATETIME";
            case "boolean":
                return "BOOLEAN";
            default:
                return "TEXT";
        }
    }

    createSyncId() {
        return "sync_id VARCHAR(255) DEFAULT 0";
    }

}
