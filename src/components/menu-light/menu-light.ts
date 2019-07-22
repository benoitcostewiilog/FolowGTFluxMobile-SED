import { Component,EventEmitter,Input,Output } from '@angular/core';

/**
 * Generated class for the MenuLight component.
 *
 * See https://angular.io/docs/ts/latest/api/core/index/ComponentMetadata-class.html
 * for more info on Angular Components.
 */
@Component({
  selector: 'menu-light',
  templateUrl: 'menu-light.html'
})
export class MenuLightComponent {

  @Input("items") items: any = [];
  @Output() itemSelected = new EventEmitter<any>();

  constructor() {

  }
  itemClick(id) {
    this.itemSelected.emit(id);
  }
}
