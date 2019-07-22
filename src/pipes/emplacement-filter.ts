import { Pipe, PipeTransform } from '@angular/core';
import { RefEmplacementModel } from '../models/ref-emplacement-model';
/**
 * Generated class for the ComptageFilter pipe.
 *
 * See https://angular.io/docs/ts/latest/guide/pipes.html for more info on
 * Angular Pipes.
 */
@Pipe({
  name: 'emplacementFilter',
})
export class EmplacementFilter implements PipeTransform {

  transform(value: any, filter: string): any {
    if (filter && filter != "") {
      filter = filter.toLocaleLowerCase();
      return filter ? value.filter(item => this.filter(item, filter)) : value;
    } {
      return value;
    }
  }

  filter(emplacement: RefEmplacementModel, filter: string) {
    if (!emplacement) {
      return false;
    }
    if (emplacement.libelle && emplacement.libelle.toLocaleLowerCase().indexOf(filter) != -1) {
      return true;
    }
    if (emplacement.code_emplacement && emplacement.code_emplacement.toLocaleLowerCase().indexOf(filter) != -1) {
      return true;
    }


    return false;
  }
}
