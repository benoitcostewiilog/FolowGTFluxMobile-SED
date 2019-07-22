import { ModelEntity } from '../../../db/model-entity';
import { SyncModel } from '../sync-model';
import { SyncDB } from '../../db/sync-db';


export class SyncModelBase extends ModelEntity<SyncModel> {

    public db: SyncDB = new SyncDB();
    
    public id: number;
    public name: string;
    public nameServer: string;
    public syncAt: string;
    public nbRow: number;
    public createdAt: string;
    public updatedAt: string;


    getPrimaryKey(): number {
        return this.id;
    }

    getIdServer(): number {
        return null;
    }
    setIdServer(idServer) {

    }
    getSyncAt(): string {
        return this.syncAt;
    }

    createFromArray(data) {
        this.createFromArrayDefaultAttribut(data);

        this.name = data.name ? data.name : null;
        this.nameServer = data.nameServer ? data.nameServer : null;
        this.syncAt = data.syncAt ? data.syncAt : null;
        this.nbRow = this.createFromArrayExtractValue(data.nbRow);
    }

    toArray(): any {
        let array = {
            name: this.name,
            nameServer: this.nameServer,
            syncAt: this.syncAt,
            nbRow: this.nbRow
        };


        return this.toArrayAddDefaultAttribut(array);
    }


}
