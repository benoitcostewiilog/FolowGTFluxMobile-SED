import { Pipe, PipeTransform } from '@angular/core';
import { WrkMouvementModel } from '../models/wrk-mouvement-model';
/**
 * Generated class for the ComptageFilter pipe.
 *
 * See https://angular.io/docs/ts/latest/guide/pipes.html for more info on
 * Angular Pipes.
 */
@Pipe({
  name: 'mouvementFilter',
})
export class MouvementFilter implements PipeTransform {

  transform(value: any, filter: string): any {
    if (filter && filter != "") {
      filter = filter.toLocaleLowerCase();
      return filter ? value.filter(item => this.filter(item, filter)) : value;
    } {
      return value;
    }
  }

  filter(mouvement: WrkMouvementModel, filter: string) {
    if (!mouvement) {
      return false;
    }
    if (mouvement.ref_produit && mouvement.ref_produit.toLocaleLowerCase().indexOf(filter) != -1) {
      return true;
    }


    return false;
  }
}
