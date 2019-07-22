import {Injectable} from '@angular/core';
import {DBEntity} from '../../../db/db-entity';
import {SyncModel} from '../../model/sync-model';

@Injectable()
export class SyncDBBase extends DBEntity<SyncModel> {
    protected name: string = "sync";
    protected attributes: any = {
        name: {
            type: 'string'
        },
        nameServer: {
            type: 'string'
        },
        syncAt: {
            type: 'string'
        },
        nbRow: {
            type: 'integer'
        },
    };


    constructor() {
        super(SyncModel);
    }



}
